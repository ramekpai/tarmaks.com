import { ui, defaultLang } from './index';

export function getStaticPaths() {
  return [
    { params: { lang: 'ru' } },
    { params: { lang: 'en' } },
  ];
}

export function translatePath(path: string, lang: string) {
  if (lang === defaultLang) {
    return path;
  }
  return `/${lang}${path}`;
}

export function getLocaleFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}
