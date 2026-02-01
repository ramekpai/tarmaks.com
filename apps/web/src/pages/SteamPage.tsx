import { AccountList, CompareTable } from '@/components/steam';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchGameDetails, useProfile, useExchangeRates } from '@/hooks/useSteamApi';
import { useSteamStore } from '@/stores/steamStore';
import { useQueries } from '@tanstack/react-query';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GameRow {
  appId: string;
  name: string;
  headerImage?: string;
  accounts: Record<string, boolean>;
  prices: Record<string, { price: string; priceUsd: number; discount: number }>;
  bestRegion: string | null;
}

export function SteamPage() {
  const { t } = useTranslation('steam');
  const {
    accounts,
    addAccount,
    updateAccount,
    wishlists,
    setWishlist,
    isComparing,
    setIsComparing,
    comparisonProgress,
    setComparisonProgress,
    targetCurrency,
    setTargetCurrency,
    setExchangeRates,
  } = useSteamStore();

  const [comparisonData, setComparisonData] = useState<GameRow[]>([]);
  const [pendingSteamId, setPendingSteamId] = useState<string | null>(null);

  // Fetch exchange rates
  const { data: rates } = useExchangeRates();
  
  useEffect(() => {
    if (rates) {
      setExchangeRates(rates);
    }
  }, [rates, setExchangeRates]);

  // Get steamId from URL for new account
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const steamId = params.get('steamId');
    if (steamId && !pendingSteamId) {
      setPendingSteamId(steamId);
    }
  }, [pendingSteamId]);

  // Fetch profile for new account
  const { data: newProfile, isLoading: isLoadingProfile } = useProfile(pendingSteamId);

  // Add new account when profile is loaded
  useEffect(() => {
    if (newProfile && pendingSteamId) {
      // Check if account already exists before adding
      const accountExists = accounts.some((a) => a.steamId === newProfile.steamId);
      
      if (!accountExists) {
        addAccount({
          steamId: newProfile.steamId,
          personaName: newProfile.personaName,
          avatarUrl: newProfile.avatarUrl,
          profileUrl: newProfile.profileUrl,
          countryCode: newProfile.countryCode,
        });
      }

      // Clean URL and reset pending steamId
      window.history.replaceState({}, '', window.location.pathname);
      setPendingSteamId(null);
    }
  }, [newProfile, pendingSteamId, addAccount, accounts]);

  // Fetch wishlists for all accounts using React Query (with caching)
  const wishlistQueries = useQueries({
    queries: accounts
      .filter((account) => !wishlists[account.steamId]) // Only fetch if not in store
      .map((account) => ({
        queryKey: ['steam', 'wishlist', account.steamId],
        queryFn: async () => {
          const res = await fetch(`/api/steam/prices/wishlist?steamId=${account.steamId}`);
          if (!res.ok) throw new Error('Failed to fetch wishlist');
          return res.json();
        },
        enabled: !!account.steamId,
        staleTime: 1000 * 60 * 10, // 10 minutes cache
      })),
  });

  // Update store when wishlist data is loaded
  useEffect(() => {
    const accountsToFetch = accounts.filter((account) => !wishlists[account.steamId]);
    wishlistQueries.forEach((query, index) => {
      const account = accountsToFetch[index];
      if (account && query.data && !wishlists[account.steamId]) {
        setWishlist(account.steamId, query.data.items || []);
        updateAccount(account.id, { wishlistCount: query.data.count });
      }
    });
  }, [wishlistQueries, accounts, wishlists, setWishlist, updateAccount]);

  // Compare wishlists
  const handleCompare = async () => {
    if (accounts.length < 2) return;

    setIsComparing(true);
    setComparisonData([]);

    try {
      // Collect all unique games
      const allGames = new Map<string, { appId: string; owners: Set<string> }>();

      for (const account of accounts) {
        const items = wishlists[account.steamId] || [];
        for (const item of items) {
          if (!allGames.has(item.appId)) {
            allGames.set(item.appId, { appId: item.appId, owners: new Set() });
          }
          allGames.get(item.appId)!.owners.add(account.steamId);
        }
      }

      const gameList = Array.from(allGames.values());
      const totalGames = gameList.length;

      if (totalGames === 0) {
        setIsComparing(false);
        return;
      }

      setComparisonProgress({ current: 0, total: totalGames });

      // Fetch game details
      const appIds = gameList.map((g) => g.appId);
      const gameDetails = await fetchGameDetails(appIds);

      // Build comparison data
      const rows: GameRow[] = gameList.map((game) => {
        const details = gameDetails[game.appId];
        const accountsMap: Record<string, boolean> = {};

        for (const account of accounts) {
          accountsMap[account.steamId] = game.owners.has(account.steamId);
        }

        return {
          appId: game.appId,
          name: details?.name || `App ${game.appId}`,
          headerImage: details?.headerImage,
          accounts: accountsMap,
          prices: {},
          bestRegion: null,
        };
      });

      // Fetch prices if regions are selected
      const regionsToFetch = [...new Set(accounts.filter((a) => a.region).map((a) => a.region!))];

      if (regionsToFetch.length > 0) {
        // Batch size: backend processes max 50 requests concurrently
        // Increased to 50 to reduce number of requests and leverage backend batching
        const batchSize = 50;

        for (let i = 0; i < appIds.length; i += batchSize) {
          const batch = appIds.slice(i, i + batchSize);

          try {
            const res = await fetch(
              `/api/steam/prices?appIds=${batch.join(',')}&regions=${regionsToFetch.join(',')}`
            );

            if (res.ok) {
              const { prices } = await res.json();

              // Update rows with prices
              for (const row of rows) {
                if (prices[row.appId]) {
                  let bestPrice = Number.POSITIVE_INFINITY;
                  let bestRegion: string | null = null;

                  for (const region of regionsToFetch) {
                    const priceData = prices[row.appId][region];
                    if (priceData) {
                      row.prices[region] = {
                        price: priceData.priceFormatted || '—',
                        priceUsd: priceData.priceUsd ?? -1,
                        discount: priceData.discount || 0,
                      };

                      if (priceData.priceUsd > 0 && priceData.priceUsd < bestPrice) {
                        bestPrice = priceData.priceUsd;
                        bestRegion = region;
                      }
                    }
                  }

                  row.bestRegion = bestRegion;
                }
              }
            } else {
              console.error(`Failed to fetch prices: ${res.status} ${res.statusText}`);
              // Continue processing even if some batches fail
            }
          } catch (err) {
            console.error('Failed to fetch prices:', err);
            // Continue processing even if some batches fail
          }

          setComparisonProgress({
            current: Math.min(i + batchSize, totalGames),
            total: totalGames,
          });

          // Small delay
          if (i + batchSize < appIds.length) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }

      setComparisonData(rows);
    } catch (err) {
      console.error('Comparison failed:', err);
    } finally {
      setIsComparing(false);
      setComparisonProgress(null);
    }
  };

  return (
    <div className="container max-w-screen-2xl py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t('description')}</p>
      </div>

      {/* Accounts */}
      <Card>
        <CardContent className="pt-6">
          <AccountList />
        </CardContent>
      </Card>

      {/* Compare button */}
      {accounts.length >= 2 && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleCompare} disabled={isComparing}>
            {isComparing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {comparisonProgress
                  ? t('compare.loading', {
                      current: comparisonProgress.current,
                      total: comparisonProgress.total,
                    })
                  : t('compare.loading', { current: 0, total: '...' })}
              </>
            ) : (
              <>
                <Gamepad2 className="h-4 w-4 mr-2" />
                {t('compare.button')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Comparison results */}
      {comparisonData.length > 0 && <CompareTable accounts={accounts} games={comparisonData} />}
    </div>
  );
}
