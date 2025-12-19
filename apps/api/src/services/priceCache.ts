import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db';

// Exchange rates to USD (approximate)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  RUB: 0.011,
  KZT: 0.002,
  TRY: 0.031,
  UAH: 0.024,
  PLN: 0.25,
  BRL: 0.2,
  ARS: 0.0011,
  CNY: 0.14,
  JPY: 0.0067,
  INR: 0.012,
};

// Cache TTL: 6 hours
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Rate limiting
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes between global refreshes
let lastGlobalRefresh = 0;
let isRefreshing = false;

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

    for (const appId of appIds) {
      result.prices[appId] = {};

      for (const region of regions) {
        // Try cache first
        const cached = await this.getCachedPrice(appId, region, staleTime);

        if (cached) {
          result.prices[appId][region] = { ...cached, fromCache: true };
          result.stats.cacheHits++;
        } else {
          // Fetch from Steam
          const price = await this.fetchPriceFromSteam(appId, region);
          result.prices[appId][region] = { ...price, fromCache: false };

          if (price.available) {
            await this.cachePrice(price);
            result.stats.cacheMisses++;
          } else {
            result.stats.errors++;
          }

          // Small delay to avoid rate limiting
          await this.delay(200);
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

  private async fetchPriceFromSteam(appId: string, region: string): Promise<PriceInfo> {
    try {
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${region.toLowerCase()}&filters=price_overview`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      });

      // Check for HTML response (rate limited)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        console.warn(`Rate limited for ${appId}/${region}`);
        return this.createUnavailablePrice(appId, region);
      }

      if (!response.ok) {
        return this.createUnavailablePrice(appId, region);
      }

      const data = (await response.json()) as SteamAppDetailsResponse;
      const appData = data[appId];

      if (!appData?.success) {
        return this.createUnavailablePrice(appId, region);
      }

      if (appData.data?.is_free) {
        return {
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
      }

      const priceOverview = appData.data?.price_overview;

      if (!priceOverview) {
        return this.createUnavailablePrice(appId, region);
      }

      const currency = priceOverview.currency;
      const price = priceOverview.final;
      const rate = EXCHANGE_RATES[currency] || 0.01;

      return {
        appId,
        region,
        currency,
        price,
        priceFormatted: priceOverview.final_formatted,
        discount: priceOverview.discount_percent || 0,
        priceUsd: (price / 100) * rate,
        available: true,
        fromCache: false,
      };
    } catch (error) {
      console.error(`Error fetching price for ${appId}/${region}:`, error);
      return this.createUnavailablePrice(appId, region);
    }
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
