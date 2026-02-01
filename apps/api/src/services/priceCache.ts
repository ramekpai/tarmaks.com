import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { steamQueue } from './steamQueue';
import { exchangeRateService } from './exchangeRates';

// Cache TTL: 6 hours
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Rate limiting
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes between global refreshes
let lastGlobalRefresh = 0;
let isRefreshing = false;

// Track rate limiting to dynamically adjust delays
let consecutiveRateLimits = 0;
let lastRateLimitTime = 0;

interface PriceInfo {
  appId: string;
  region: string;
  currency: string | null;
  price: number | null;
  priceFormatted: string | null;
  discount: number;
  priceUsd: number | null;
  available: boolean;
  fromCache: boolean;
}

interface PriceResult {
  prices: Record<string, Record<string, PriceInfo>>;
  stats: {
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  };
}

// Steam Store API response
interface SteamPriceOverview {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  final_formatted: string;
}

interface SteamAppDetails {
  success: boolean;
  data?: {
    is_free?: boolean;
    price_overview?: SteamPriceOverview;
  };
}

type SteamAppDetailsResponse = Record<string, SteamAppDetails>;

export class PriceCacheService {
  // Get prices from cache or fetch from Steam
  async getPrices(appIds: string[], regions: string[]): Promise<PriceResult> {
    const result: PriceResult = {
      prices: {},
      stats: { cacheHits: 0, cacheMisses: 0, errors: 0 },
    };

    const now = Date.now();
    const staleTime = new Date(now - CACHE_TTL);

    // First, check cache for all combinations
    const allCombinations: Array<{ appId: string; region: string; cached: PriceInfo | null }> = [];
    
    for (const appId of appIds) {
      result.prices[appId] = {};
      for (const region of regions) {
        const cached = await this.getCachedPrice(appId, region, staleTime);
        allCombinations.push({ appId, region, cached });
        
        if (cached) {
          result.prices[appId][region] = { ...cached, fromCache: true };
          result.stats.cacheHits++;
        }
      }
    }

    // Filter out cached items - only fetch what's missing
    const toFetch = allCombinations.filter((c) => !c.cached);

    if (toFetch.length === 0) {
      return result; // All cached, nothing to fetch
    }

    // Process missing items by grouping them by region to minimize requests
    // Group by region
    const regionGroups: Record<string, string[]> = {};
    for (const { appId, region } of toFetch) {
      if (!regionGroups[region]) {
        regionGroups[region] = [];
      }
      regionGroups[region].push(appId);
    }

    // Process each region
    const regionsToFetch = Object.keys(regionGroups);
    for (let i = 0; i < regionsToFetch.length; i++) {
      const region = regionsToFetch[i];
      if (!region) continue;
      
      const appIds = regionGroups[region];
      if (!appIds) continue;

      // Process in batches of 50 (Steam limit is 100, but 50 is safer)
      const BATCH_SIZE = 50;
      for (let j = 0; j < appIds.length; j += BATCH_SIZE) {
        const batchAppIds = appIds.slice(j, j + BATCH_SIZE);
        
        try {
          // Use the global queue to fetch prices
          const prices = await steamQueue.add(() => this.fetchBatchPricesFromSteam(batchAppIds, region));
          
          // Process results
          for (const appId of batchAppIds) {
            if (!result.prices[appId]) {
              result.prices[appId] = {};
            }
            
            const price = prices[appId];
            if (price) {
              // Cache in background
              this.cachePrice(price).catch((err) => 
                console.error(`Failed to cache price for ${appId}/${region}:`, err)
              );
              result.prices[appId][region] = { ...price, fromCache: false };
              result.stats.cacheMisses++;
            } else {
              // Failed to get price for this specific app in the batch
              const unavailable = this.createUnavailablePrice(appId, region);
              result.prices[appId][region] = unavailable;
              result.stats.errors++;
            }
          }
        } catch (error) {
          console.error(`Error fetching batch prices for region ${region}:`, error);
          // Mark all in batch as unavailable
          for (const appId of batchAppIds) {
            if (!result.prices[appId]) {
              result.prices[appId] = {};
            }
            const unavailable = this.createUnavailablePrice(appId, region);
            result.prices[appId][region] = unavailable;
            result.stats.errors++;
          }
        }
      }
    }

    return result;
  }

  // Check if refresh is allowed
  canRefresh(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const elapsed = now - lastGlobalRefresh;

    if (isRefreshing) {
      return { allowed: false, retryAfter: REFRESH_COOLDOWN };
    }

    if (elapsed < REFRESH_COOLDOWN) {
      return { allowed: false, retryAfter: REFRESH_COOLDOWN - elapsed };
    }

    return { allowed: true };
  }

  // Force refresh prices
  async refreshPrices(appIds: string[], regions: string[]): Promise<PriceResult> {
    isRefreshing = true;
    lastGlobalRefresh = Date.now();

    try {
      // Clear old cache for these items
      for (const appId of appIds) {
        for (const region of regions) {
          await db
            .delete(schema.priceCache)
            .where(and(eq(schema.priceCache.appId, appId), eq(schema.priceCache.region, region)));
        }
      }

      // Fetch fresh prices
      return await this.getPrices(appIds, regions);
    } finally {
      isRefreshing = false;
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    return {
      lastRefresh: lastGlobalRefresh ? new Date(lastGlobalRefresh).toISOString() : null,
      isRefreshing,
      nextRefreshAvailable: lastGlobalRefresh
        ? new Date(lastGlobalRefresh + REFRESH_COOLDOWN).toISOString()
        : 'now',
      canRefresh: now - lastGlobalRefresh >= REFRESH_COOLDOWN && !isRefreshing,
    };
  }

  // Private methods
  private async getCachedPrice(
    appId: string,
    region: string,
    staleTime: Date
  ): Promise<PriceInfo | null> {
    const cached = await db.query.priceCache.findFirst({
      where: and(eq(schema.priceCache.appId, appId), eq(schema.priceCache.region, region)),
    });

    if (!cached || !cached.updatedAt || cached.updatedAt < staleTime) {
      return null;
    }

    return {
      appId: cached.appId,
      region: cached.region,
      currency: cached.currency,
      price: cached.price,
      priceFormatted: cached.priceFormatted,
      discount: cached.discount || 0,
      priceUsd: cached.priceUsd,
      available: cached.available ?? true,
      fromCache: true,
    };
  }

  private async cachePrice(price: PriceInfo): Promise<void> {
    // Upsert logic
    const existing = await db.query.priceCache.findFirst({
      where: and(
        eq(schema.priceCache.appId, price.appId),
        eq(schema.priceCache.region, price.region)
      ),
    });

    if (existing) {
      await db
        .update(schema.priceCache)
        .set({
          currency: price.currency,
          price: price.price,
          priceFormatted: price.priceFormatted,
          discount: price.discount,
          priceUsd: price.priceUsd,
          available: price.available,
          updatedAt: new Date(),
        })
        .where(eq(schema.priceCache.id, existing.id));
    } else {
      await db.insert(schema.priceCache).values({
        appId: price.appId,
        region: price.region,
        currency: price.currency,
        price: price.price,
        priceFormatted: price.priceFormatted,
        discount: price.discount,
        priceUsd: price.priceUsd,
        available: price.available,
      });
    }
  }

  private async fetchBatchPricesFromSteam(appIds: string[], region: string): Promise<Record<string, PriceInfo>> {
    const results: Record<string, PriceInfo> = {};
    const appIdsStr = appIds.join(',');
    
    try {
      // Use filters=price_overview to allow multiple appids and reduce payload
      const url = `https://store.steampowered.com/api/appdetails?appids=${appIdsStr}&cc=${region.toLowerCase()}&filters=price_overview`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for batch

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        // Check for HTML response (rate limited)
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/html') || response.status === 429) {
          const now = Date.now();
          consecutiveRateLimits++;
          lastRateLimitTime = now;
          console.warn(`Rate limited for batch in region ${region} (Status: ${response.status})`);
          
          // Increase delay for future requests
          steamQueue.setDelay(5000); // 5 seconds delay if rate limited
          
          return results; // Return empty, will be handled as unavailable
        }

        // Reset delay if successful
        if (consecutiveRateLimits > 0) {
          consecutiveRateLimits = 0;
          steamQueue.setDelay(300); // Reset to 300ms
        }

        if (!response.ok) {
          console.error(`Steam API error: ${response.status} ${response.statusText}`);
          return results;
        }

        const data = (await response.json()) as SteamAppDetailsResponse;

        // Process each app in the response
        for (const appId of appIds) {
          const appData = data[appId];

          if (!appData?.success) {
            results[appId] = this.createUnavailablePrice(appId, region);
            continue;
          }

          if (appData.data?.is_free) {
            results[appId] = {
              appId,
              region,
              currency: null,
              price: 0,
              priceFormatted: 'Free',
              discount: 0,
              priceUsd: 0,
              available: true,
              fromCache: false,
            };
            continue;
          }

          const priceOverview = appData.data?.price_overview;

          if (!priceOverview) {
            results[appId] = this.createUnavailablePrice(appId, region);
            continue;
          }

          const currency = priceOverview.currency;
          const price = priceOverview.final;
          
          // Get rate (Currency per USD)
          const rates = await exchangeRateService.getRates();
          const rate = rates[currency] || 1; // Default to 1 if missing to avoid division by zero
          
          // Calculate USD price: Price / Rate
          // Example: 100 RUB / 90 RUB/USD = 1.11 USD
          const priceUsd = rate > 0 ? (price / 100) / rate : 0;

          results[appId] = {
            appId,
            region,
            currency,
            price,
            priceFormatted: priceOverview.final_formatted,
            discount: priceOverview.discount_percent || 0,
            priceUsd,
            available: true,
            fromCache: false,
          };
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.warn(`Request timeout for batch in region ${region}`);
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error(`Error fetching batch prices for region ${region}:`, error);
    }

    return results;
  }

  private createUnavailablePrice(appId: string, region: string): PriceInfo {
    return {
      appId,
      region,
      currency: null,
      price: null,
      priceFormatted: null,
      discount: 0,
      priceUsd: null,
      available: false,
      fromCache: false,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
