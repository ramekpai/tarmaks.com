export interface SteamAccount {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl?: string;
  countryCode?: string | null;
  region?: string;
}

export interface WishlistItem {
  appId: string;
  name?: string;
  headerImage?: string;
  priority?: number;
  dateAdded?: number;
}

export interface PriceInfo {
  appId: string;
  region: string;
  currency: string | null;
  price: number | null;
  priceFormatted: string | null;
  discount: number;
  priceUsd: number | null;
  available: boolean;
  fromCache?: boolean;
}

export interface ComparisonRow {
  appId: string;
  name: string;
  headerImage?: string;
  accounts: Record<string, boolean>; // steamId -> hasGame
  prices: Record<string, PriceInfo>; // region -> price
  bestRegion: string | null;
}
