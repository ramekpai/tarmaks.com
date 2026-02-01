import { Button } from '@/components/ui/button';
import { startSteamLogin } from '@/hooks/useSteamApi';
import { useSteamStore } from '@/stores/steamStore';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountCard } from './AccountCard';

export function AccountList() {
  const { t } = useTranslation('steam');
  const { accounts, updateAccount, removeAccount, clearAccounts } = useSteamStore();

  const handleAddAccount = () => {
    startSteamLogin('/steam');
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{t('accounts.empty')}</p>
        <Button onClick={handleAddAccount}>
          <Plus className="h-4 w-4 mr-2" />
          {t('accounts.add')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('accounts.title')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddAccount}>
            <Plus className="h-4 w-4 mr-2" />
            {t('accounts.add')}
          </Button>
          {accounts.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAccounts}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('accounts.clear') || 'Clear all'}
            </Button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onRemove={() => removeAccount(account.id)}
            onRegionChange={(region) => updateAccount(account.id, { region })}
          />
        ))}
      </div>

      {/* Hint */}
      {accounts.length < 2 && (
        <p className="text-sm text-muted-foreground text-center">{t('accounts.hint')}</p>
      )}
    </div>
  );
}
