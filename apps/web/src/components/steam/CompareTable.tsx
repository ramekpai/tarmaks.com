import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSteamStore, type SteamAccount } from '@/stores/steamStore';
import { countryCodeToFlag, STEAM_REGIONS } from '@tarmaks/shared';
import { Check, Minus, Trophy, Search, ArrowUpDown, Filter, Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';

interface GameRow {
  appId: string;
  name: string;
  headerImage?: string;
  accounts: Record<string, boolean>; // steamId -> hasGame
  prices: Record<string, { price: string; priceUsd: number; discount: number }>; // region -> price
  bestRegion: string | null;
}

interface CompareTableProps {
  accounts: SteamAccount[];
  games: GameRow[];
}

export function CompareTable({ accounts, games }: CompareTableProps) {
  const { t } = useTranslation('steam');
  const { targetCurrency, setTargetCurrency, exchangeRates } = useSteamStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'discount-desc'>('name-asc');
  const [hideNoPrices, setHideNoPrices] = useState(false);

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    // 1. Filter by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(query));
    }

    // 2. Hide no prices
    if (hideNoPrices) {
      result = result.filter((g) => {
        return accounts.some((account) => {
          if (!account.region) return false;
          const priceInfo = g.prices[account.region];
          return priceInfo && priceInfo.priceUsd >= 0;
        });
      });
    }

    // 3. Sort
    result.sort((a, b) => {
      const getMinPrice = (game: GameRow) => {
        let min = Infinity;
        accounts.forEach((acc) => {
          if (acc.region) {
            const p = game.prices[acc.region];
            if (p && p.priceUsd >= 0) {
              if (p.priceUsd < min) min = p.priceUsd;
            }
          }
        });
        return min;
      };

      const getMaxDiscount = (game: GameRow) => {
        let max = -1;
        accounts.forEach((acc) => {
          if (acc.region) {
            const p = game.prices[acc.region];
            if (p) {
              if (p.discount > max) max = p.discount;
            }
          }
        });
        return max;
      };

      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          const minPriceA = getMinPrice(a);
          const minPriceB = getMinPrice(b);
          if (minPriceA === Infinity) return 1;
          if (minPriceB === Infinity) return -1;
          return minPriceA - minPriceB;
        case 'discount-desc':
          const maxDiscountA = getMaxDiscount(a);
          const maxDiscountB = getMaxDiscount(b);
          return maxDiscountB - maxDiscountA;
        default:
          return 0;
      }
    });

    return result;
  }, [games, searchQuery, hideNoPrices, sortOption, accounts]);

  if (games.length === 0) {
    return null;
  }

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    } catch (e) {
      return `${price.toFixed(2)} ${currency}`;
    }
  };

  const regionsWithPrices = [...new Set(accounts.filter((a) => a.region).map((a) => a.region!))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('compare.result')}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('compare.currency')}:
          </span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={targetCurrency}
            onChange={(e) => setTargetCurrency(e.target.value)}
          >
            {STEAM_REGIONS.map((region) => (
              <option key={region.currency} value={region.currency}>
                {region.currency} ({region.name})
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Filters & Controls */}
        <div className="p-4 border-b bg-muted/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('compare.search_placeholder')}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
              >
                <option value="name-asc">{t('compare.sort_name_asc')}</option>
                <option value="name-desc">{t('compare.sort_name_desc')}</option>
                <option value="price-asc">{t('compare.sort_price_asc')}</option>
                <option value="discount-desc">{t('compare.sort_discount_desc')}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-primary text-primary focus:ring-1 focus:ring-ring"
                checked={hideNoPrices}
                onChange={(e) => setHideNoPrices(e.target.checked)}
              />
              <span>{t('compare.hide_no_prices')}</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium min-w-[200px]">
                  {t('compare.game') || 'Game'}
                </th>
                {accounts.map((account) => (
                  <th key={account.steamId} className="text-center p-3 font-medium min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <img
                        src={account.avatarUrl}
                        alt={account.personaName}
                        className="w-8 h-8 rounded"
                      />
                      <span className="text-xs truncate max-w-[80px]">{account.personaName}</span>
                      {account.region && (
                        <span className="text-xs">{countryCodeToFlag(account.region)}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedGames.map((game) => (
                <tr key={game.appId} className="border-b hover:bg-muted/30">
                  {/* Game info */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {game.headerImage && (
                        <img
                          src={game.headerImage}
                          alt={game.name}
                          className="w-[120px] h-[45px] object-cover rounded"
                        />
                      )}
                      <span className="font-medium">{game.name}</span>
                    </div>
                  </td>

                  {/* Account columns */}
                  {accounts.map((account) => {
                    const hasGame = game.accounts[account.steamId];
                    const priceInfo = account.region ? game.prices[account.region] : null;
                    const isBest = account.region === game.bestRegion;

                    // Calculate converted price
                    let displayPrice = null;

                    if (priceInfo && priceInfo.priceUsd >= 0) {
                      const targetRate = exchangeRates[targetCurrency] || 1;
                      const convertedValue = priceInfo.priceUsd * targetRate;
                      const formattedConverted = formatPrice(convertedValue, targetCurrency);
                      
                      // Check if the region's currency matches the target currency
                      const regionInfo = STEAM_REGIONS.find((r) => r.code === account.region);
                      const isOriginalCurrency = regionInfo?.currency === targetCurrency;

                      const prefix = isOriginalCurrency ? '' : '~';
                      
                      displayPrice = (
                        <div className="flex flex-col items-center">
                          <span>
                            {isOriginalCurrency ? priceInfo.price : `${prefix}${formattedConverted}`}
                          </span>
                          {!isOriginalCurrency && priceInfo.price && (
                             <span className="text-[10px] text-muted-foreground opacity-70">
                               ({priceInfo.price})
                             </span>
                          )}
                        </div>
                      );
                    } else if (priceInfo) {
                        displayPrice = priceInfo.price || '—';
                    }

                    return (
                      <td key={account.steamId} className="p-3 text-center">
                        {/* Has game indicator */}
                        <div className="flex flex-col items-center gap-1">
                          {hasGame ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <Minus className="h-5 w-5 text-muted-foreground" />
                          )}

                          {/* Price */}
                          {priceInfo && (
                            <div
                              className={`text-xs ${isBest ? 'text-green-600 font-semibold' : ''}`}
                            >
                              {displayPrice}
                              {priceInfo.discount > 0 && (
                                <span className="ml-1 text-green-500">-{priceInfo.discount}%</span>
                              )}
                              {isBest && <Trophy className="inline h-3 w-3 ml-1 text-yellow-500" />}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
