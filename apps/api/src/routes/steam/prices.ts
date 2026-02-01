import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '../../db';
import { PriceCacheService } from '../../services/priceCache';
import { steamQueue } from '../../services/steamQueue';
import { exchangeRateService } from '../../services/exchangeRates';

export const pricesRoutes = new Hono();

const priceCache = new PriceCacheService();

// Game cache TTL: 24 hours (game info rarely changes)
const GAME_CACHE_TTL = 24 * 60 * 60 * 1000;

// Steam API response types
interface WishlistItem {
  appid: number;
  priority: number;
  date_added: number;
}

interface WishlistResponse {
  response: {
    items?: WishlistItem[];
  };
}

// Query schema
const pricesQuerySchema = z.object({
  appIds: z.string().transform((s) => s.split(',')),
  regions: z.string().transform((s) => s.split(',')),
});

// Get current exchange rates
pricesRoutes.get('/rates', async (c) => {
  const rates = await exchangeRateService.getRates();
  return c.json(rates);
});

// Get prices for multiple apps in multiple regions
pricesRoutes.get('/', zValidator('query', pricesQuerySchema), async (c) => {
  const { appIds, regions } = c.req.valid('query');

  if (appIds.length === 0 || regions.length === 0) {
    return c.json({ error: 'Missing appIds or regions' }, 400);
  }

  if (appIds.length > 50) {
    return c.json({ error: 'Maximum 50 apps per request' }, 400);
  }

  const result = await priceCache.getPrices(appIds, regions);

  return c.json(result);
});

// Get wishlist for a Steam user
const wishlistQuerySchema = z.object({
  steamId: z.string().regex(/^\d{17}$/, 'Invalid Steam ID'),
});

pricesRoutes.get('/wishlist', zValidator('query', wishlistQuerySchema), async (c) => {
  const { steamId } = c.req.valid('query');

  try {
    const response = await fetch(
      `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId}`
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch wishlist' }, 502);
    }

    const data = (await response.json()) as WishlistResponse;
    const items = data.response?.items || [];

    return c.json({
      steamId,
      count: items.length,
      items: items.map((item) => ({
        appId: item.appid.toString(),
        priority: item.priority,
        dateAdded: item.date_added,
      })),
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return c.json({ error: 'Failed to fetch wishlist' }, 500);
  }
});

// Force refresh prices (with rate limiting)
pricesRoutes.post('/refresh', zValidator('query', pricesQuerySchema), async (c) => {
  const { appIds, regions } = c.req.valid('query');

  const canRefresh = priceCache.canRefresh();

  if (!canRefresh.allowed) {
    return c.json(
      {
        error: 'Rate limited',
        retryAfter: canRefresh.retryAfter,
      },
      429
    );
  }

  const result = await priceCache.refreshPrices(appIds, regions);

  return c.json(result);
});

// Get cache stats
pricesRoutes.get('/stats', (c) => {
  return c.json(priceCache.getStats());
});

// Get game details from Steam Store API
const gameDetailsQuerySchema = z.object({
  appIds: z.string().transform((s) => s.split(',').filter(Boolean)),
});

pricesRoutes.get('/games', zValidator('query', gameDetailsQuerySchema), async (c) => {
  const { appIds } = c.req.valid('query');

  if (appIds.length === 0) {
    return c.json({ error: 'Missing appIds' }, 400);
  }

  if (appIds.length > 20) {
    return c.json({ error: 'Maximum 20 apps per request' }, 400);
  }

  const results: Record<string, { appId: string; name: string; headerImage: string }> = {};
  const now = Date.now();
  const staleTime = new Date(now - GAME_CACHE_TTL);

  // First, check cache for all games
  const cachedGames = await db.query.gameCache.findMany({
    where: inArray(schema.gameCache.appId, appIds),
  });

  const cachedMap = new Map<string, typeof cachedGames[0]>();
  const toFetch: string[] = [];

  for (const cached of cachedGames) {
    // Check if cache is still valid
    if (cached.updatedAt && cached.updatedAt >= staleTime) {
      results[cached.appId] = {
        appId: cached.appId,
        name: cached.name,
        headerImage: cached.headerImage,
      };
      cachedMap.set(cached.appId, cached);
    } else {
      toFetch.push(cached.appId);
    }
  }

  // Find games not in cache at all
  for (const appId of appIds) {
    if (!cachedMap.has(appId) && !toFetch.includes(appId)) {
      toFetch.push(appId);
    }
  }

  // Fetch missing games from Steam API
  if (toFetch.length > 0) {
    const batchSize = 20; // Increased from 10 to 20 (max allowed by route)
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);

      try {
        // Use steamQueue to respect global rate limits
        await steamQueue.add(async () => {
          // Fetch all games in batch in parallel (since we have to use single appid requests for basic info? 
          // Wait, appdetails supports multiple appids even for basic info!)
          
          const appIdsStr = batch.join(',');
          const response = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${appIdsStr}&filters=basic`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                Accept: 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = (await response.json()) as Record<
              string,
              { success: boolean; data?: { name: string; header_image: string } }
            >;

            for (const appId of batch) {
              if (data[appId]?.success && data[appId]?.data) {
                const gameData = {
                  appId,
                  name: data[appId].data.name,
                  headerImage: data[appId].data.header_image,
                };

                results[appId] = gameData;

                // Save to cache (upsert)
                const existing = cachedMap.get(appId);
                if (existing) {
                  await db
                    .update(schema.gameCache)
                    .set({
                      name: gameData.name,
                      headerImage: gameData.headerImage,
                      updatedAt: new Date(),
                    })
                    .where(eq(schema.gameCache.appId, appId));
                } else {
                  await db.insert(schema.gameCache).values({
                    appId: gameData.appId,
                    name: gameData.name,
                    headerImage: gameData.headerImage,
                  });
                }
              }
            }
          } else {
             if (response.status === 429) {
                steamQueue.setDelay(5000);
             }
          }
        });
      } catch (error) {
        console.error(`Error fetching game details batch:`, error);
      }
    }
  }

  return c.json({ games: results });
});
