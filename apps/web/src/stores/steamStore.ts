import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SteamAccount {
  id: string; // unique id for UI
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl?: string;
  countryCode?: string | null;
  region?: string; // Selected store region for price comparison
  wishlistCount?: number;
}

export interface WishlistItem {
  appId: string;
  name?: string;
  headerImage?: string;
  priority?: number;
}

interface SteamState {
  // Accounts
  accounts: SteamAccount[];
  addAccount: (account: Omit<SteamAccount, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<SteamAccount>) => void;
  removeAccount: (id: string) => void;
  clearAccounts: () => void;

  // Wishlists (keyed by steamId)
  wishlists: Record<string, WishlistItem[]>;
  setWishlist: (steamId: string, items: WishlistItem[]) => void;

  // Comparison state
  isComparing: boolean;
  setIsComparing: (value: boolean) => void;
  comparisonProgress: { current: number; total: number } | null;
  setComparisonProgress: (progress: { current: number; total: number } | null) => void;
  targetCurrency: string;
  setTargetCurrency: (currency: string) => void;
  exchangeRates: Record<string, number>;
  setExchangeRates: (rates: Record<string, number>) => void;
}

export const useSteamStore = create<SteamState>()(
  persist(
    (set) => ({
      // Accounts
      accounts: [],
      addAccount: (account) =>
        set((state) => {
          // Check if already exists
          if (state.accounts.some((a) => a.steamId === account.steamId)) {
            return state;
          }
          return {
            accounts: [...state.accounts, { ...account, id: crypto.randomUUID() }],
          };
        }),
      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
        })),
      clearAccounts: () => set({ accounts: [], wishlists: {} }),

      // Wishlists
      wishlists: {},
      setWishlist: (steamId, items) =>
        set((state) => ({
          wishlists: { ...state.wishlists, [steamId]: items },
        })),

      // Comparison
      isComparing: false,
      setIsComparing: (value) => set({ isComparing: value }),
      comparisonProgress: null,
      setComparisonProgress: (progress) => set({ comparisonProgress: progress }),
      targetCurrency: 'RUB', // Default to RUB
      setTargetCurrency: (currency) => set({ targetCurrency: currency }),
      exchangeRates: {},
      setExchangeRates: (rates) => set({ exchangeRates: rates }),
    }),
    {
      name: 'steam-accounts',
      partialize: (state) => ({
        accounts: state.accounts,
        targetCurrency: state.targetCurrency,
        exchangeRates: state.exchangeRates,
      }),
    }
  )
);
