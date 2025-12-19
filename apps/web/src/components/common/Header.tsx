import { Button } from '@/components/ui/button';
import { getLanguageFromPath, localizedPath } from '@/i18n';
import { Link, useLocation } from '@tanstack/react-router';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const currentLang = getLanguageFromPath(location.pathname);

  const toggleLanguage = () => {
    const newLang = currentLang === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(newLang);

    // Navigate to localized version of current page
    const pathWithoutLang = location.pathname.replace(/^\/en/, '') || '/';
    window.location.href = localizedPath(pathWithoutLang, newLang);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link to={localizedPath('/', currentLang)} className="mr-6 flex items-center space-x-2">
          <span className="font-bold text-xl">Tarmaks</span>
        </Link>

        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          <Link
            to={localizedPath('/', currentLang)}
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            {t('nav.home')}
          </Link>
          <Link
            to={localizedPath('/steam', currentLang)}
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Steam
          </Link>
        </nav>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={toggleLanguage}>
            <Globe className="h-4 w-4" />
            <span>{currentLang.toUpperCase()}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
