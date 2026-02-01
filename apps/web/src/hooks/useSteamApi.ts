import { useMutation, useQuery } from '@tanstack/react-query';

const API_BASE = '/api/steam';

// Types
interface ProfileResponse {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl?: string;
  countryCode?: string | null;
}

interface WishlistItem {
  appId: string;
  priority: number;
  dateAdded: number;
}

interface WishlistResponse {
  steamId: string;
  count: number;
  items: WishlistItem[];
}

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

interface PricesResponse {
  prices: Record<string, Record<string, PriceInfo>>;
  stats: {
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  };
}

interface GameDetails {
  appId: string;
  name: string;
  headerImage: string;
}

// Fetch profile by Steam ID
export function useProfile(steamId: string | null) {
  return useQuery({
    queryKey: ['steam', 'profile', steamId],
    queryFn: async (): Promise<ProfileResponse> => {
      const res = await fetch(`${API_BASE}/auth/profile?steamId=${steamId}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!steamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch wishlist by Steam ID
export function useWishlist(steamId: string | null) {
  return useQuery({
    queryKey: ['steam', 'wishlist', steamId],
    queryFn: async (): Promise<WishlistResponse> => {
      const res = await fetch(`${API_BASE}/prices/wishlist?steamId=${steamId}`);
      if (!res.ok) throw new Error('Failed to fetch wishlist');
      return res.json();
    },
    enabled: !!steamId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Fetch game details from Steam Store API via backend
export async function fetchGameDetails(appIds: string[]): Promise<Record<string, GameDetails>> {
  const results: Record<string, GameDetails> = {};

  // Fetch in batches of 20 (backend limit) to avoid rate limiting
  const batchSize = 20;
  for (let i = 0; i < appIds.length; i += batchSize) {
    const batch = appIds.slice(i, i + batchSize);

    try {
      const res = await fetch(`${API_BASE}/prices/games?appIds=${batch.join(',')}`);
      if (res.ok) {
        const data = (await res.json()) as { games: Record<string, GameDetails> };
        Object.assign(results, data.games || {});
      }
    } catch (error) {
      console.error('Failed to fetch game details:', error);
      // Continue with other batches
    }

    // Small delay between batches
    if (i + batchSize < appIds.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

// Fetch prices for multiple apps and regions
export function usePrices(appIds: string[], regions: string[], enabled = true) {
  return useQuery({
    queryKey: ['steam', 'prices', appIds.join(','), regions.join(',')],
    queryFn: async (): Promise<PricesResponse> => {
      const res = await fetch(
        `${API_BASE}/prices?appIds=${appIds.join(',')}&regions=${regions.join(',')}`
      );
      if (!res.ok) throw new Error('Failed to fetch prices');
      return res.json();
    },
    enabled: enabled && appIds.length > 0 && regions.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Mutation to refresh prices
export function useRefreshPrices() {
  return useMutation({
    mutationFn: async ({ appIds, regions }: { appIds: string[]; regions: string[] }) => {
      const res = await fetch(
        `${API_BASE}/prices/refresh?appIds=${appIds.join(',')}&regions=${regions.join(',')}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to refresh prices');
      }
      return res.json();
    },
  });
}

// Fetch exchange rates
export function useExchangeRates() {
  return useQuery({
    queryKey: ['steam', 'rates'],
    queryFn: async (): Promise<Record<string, number>> => {
      const res = await fetch(`${API_BASE}/prices/rates`);
      if (!res.ok) throw new Error('Failed to fetch rates');
      return res.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

// Start Steam login flow
export function startSteamLogin(returnPath = '/steam') {
  const apiUrl = window.location.origin;
  window.location.href = `${apiUrl}/api/steam/auth/login?returnUrl=${encodeURIComponent(returnPath)}`;
}
