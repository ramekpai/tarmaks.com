import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLanguageFromPath, localizedPath } from '@/i18n';
import { Link } from '@tanstack/react-router';
import { Construction, Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation('home');
  const currentLang = getLanguageFromPath(window.location.pathname);

  return (
    <div className="container max-w-screen-2xl py-16">
      {/* Hero */}
      <div className="flex flex-col items-center text-center space-y-6 pb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">{t('title')}</h1>
        <p className="text-xl text-muted-foreground">{t('subtitle')}</p>
        <p className="max-w-2xl text-muted-foreground">{t('description')}</p>

        <div className="flex gap-4 pt-4">
          <Button asChild size="lg">
            <Link to={localizedPath('/steam', currentLang)}>{t('cta.projects')}</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="mailto:hello@tarmaks.com">{t('cta.contact')}</a>
          </Button>
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center">
          {currentLang === 'ru' ? 'Проекты' : 'Projects'}
        </h2>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Link to={localizedPath('/steam', currentLang)}>
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Steam Wishlist Compare</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {currentLang === 'ru'
                    ? 'Сравнение цен на игры из списка желаемого по разным регионам'
                    : 'Compare game prices from wishlists across different regions'}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full opacity-60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Construction className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-muted-foreground">
                  {currentLang === 'ru' ? 'Скоро...' : 'Coming soon...'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {currentLang === 'ru' ? 'Здесь будут другие проекты' : 'More projects coming here'}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
