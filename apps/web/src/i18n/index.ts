import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import ruCommon from './locales/ru/common.json';
import ruHome from './locales/ru/home.json';
import ruSteam from './locales/ru/steam.json';

import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enSteam from './locales/en/steam.json';

// Resources
const resources = {
  ru: {
    common: ruCommon,
    home: ruHome,
    steam: ruSteam,
  },
  en: {
    common: enCommon,
    home: enHome,
    steam: enSteam,
  },
};

// Initialize i18next
i18n.use(initReactI18next).init({
  resources,
  lng: 'ru', // Default language
  fallbackLng: 'ru',
  defaultNS: 'common',
  ns: ['common', 'home', 'steam'],
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;

// Helper to get language from URL
export function getLanguageFromPath(pathname: string): 'ru' | 'en' {
  if (pathname.startsWith('/en')) {
    return 'en';
  }
  return 'ru';
}

// Helper to build localized path
export function localizedPath(path: string, lang: 'ru' | 'en'): string {
  if (lang === 'ru') {
    return path; // Default language, no prefix
  }
  return `/en${path === '/' ? '' : path}`;
}
