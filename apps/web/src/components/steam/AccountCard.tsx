import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SteamAccount } from '@/stores/steamStore';
import { countryCodeToFlag } from '@tarmaks/shared';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RegionSelect } from './RegionSelect';

interface AccountCardProps {
  account: SteamAccount;
  onRemove: () => void;
  onRegionChange: (region: string) => void;
}

export function AccountCard({ account, onRemove, onRegionChange }: AccountCardProps) {
  const { t } = useTranslation('steam');

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <img src={account.avatarUrl} alt={account.personaName} className="w-16 h-16 rounded-lg" />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{account.personaName}</h3>
              {account.countryCode && (
                <span title={account.countryCode} className="text-lg">
                  {countryCodeToFlag(account.countryCode)}
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {account.wishlistCount !== undefined
                ? `${account.wishlistCount} ${t('wishlist.games')}`
                : t('wishlist.empty')}
            </p>

            {/* Region selector */}
            <div className="mt-3">
              <RegionSelect value={account.region || ''} onChange={onRegionChange} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
