import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('footer.copyright', { year })}</p>
      </div>
    </footer>
  );
}
