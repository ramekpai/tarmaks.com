import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { PriceCacheService } from '../../services/priceCache';

export const pricesRoutes = new Hono();

const priceCache = new PriceCacheService();

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
