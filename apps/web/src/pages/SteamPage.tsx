import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SteamPage() {
  const { t } = useTranslation('steam');

  return (
    <div className="container max-w-screen-2xl py-8">
      {/* Header */}
      <div className="text-center space-y-4 pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t('description')}</p>
      </div>

      {/* Main Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-primary/10 w-fit mb-4">
            <Gamepad2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>{t('accounts.title')}</CardTitle>
          <CardDescription>{t('accounts.hint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button size="lg">{t('accounts.add')}</Button>
        </CardContent>
      </Card>

      {/* Migration Notice */}
      <Card className="max-w-2xl mx-auto mt-6 border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">
            Steam comparison component is being migrated from Astro version. Coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
