import type { PriceInfo } from './steam';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PricesResponse {
  prices: Record<string, Record<string, PriceInfo>>;
  stats: {
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  };
}

export interface WishlistResponse {
  steamId: string;
  count: number;
  items: {
    appId: string;
    priority: number;
    dateAdded: number;
  }[];
}

export interface ProfileResponse {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl?: string;
  countryCode?: string | null;
}

export interface CacheStatsResponse {
  lastRefresh: string | null;
  isRefreshing: boolean;
  nextRefreshAvailable: string;
  canRefresh: boolean;
}
