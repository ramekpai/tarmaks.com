import { defineMiddleware } from 'astro:middleware';
import { ui, defaultLang } from './i18n';

const LANG_CODE_REGEX = /^\/([a-z]{2})(\/.*)?$/;

function getPreferredLocale(request: Request): string | null {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return null;
  
  for (const lang of Object.keys(ui)) {
    if (acceptLanguage.includes(lang)) {
      return lang;
    }
  }
  
  return null;
}

export const onRequest = defineMiddleware((context, next) => {
  const { url, redirect, request } = context;
  const pathname = url.pathname;
  
  if (pathname === '/') {
    const preferredLocale = getPreferredLocale(request);
    const targetLocale = preferredLocale || defaultLang;
    return redirect(`/${targetLocale}/`, 301);
  }
  
  const match = pathname.match(LANG_CODE_REGEX);
  if (match) {
    const potentialLang = match[1];
    if (!(potentialLang in ui)) {
      const preferredLocale = getPreferredLocale(request);
      const targetLocale = preferredLocale || defaultLang;
      
      const restPath = match[2] || '/';
      const newPath = `/${targetLocale}${restPath}`;
      return redirect(newPath, 301);
    }
  }
  
  return next();
});
