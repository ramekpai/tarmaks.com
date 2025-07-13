import { defineMiddleware } from 'astro:middleware';
import { defaultLang } from './i18n';

export const onRequest = defineMiddleware(({ currentLocale, url, redirect }, next) => {
  if (!currentLocale) {
    const targetLocale = defaultLang;
    
    const pathname = url.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    const potentialLang = pathSegments[0];
    
    if (potentialLang && potentialLang.length === 2) {
      const restPath = pathname.slice(potentialLang.length + 1);
      const newPath = `/${targetLocale}${restPath}`;
      return redirect(newPath, 302);
    } else {
      const newPath = `/${targetLocale}${pathname}`;
      return redirect(newPath, 302);
    }
  }
  
  return next();
});
