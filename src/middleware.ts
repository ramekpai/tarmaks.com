import { defineMiddleware } from 'astro:middleware';
import { ui, defaultLang } from './i18n';

function getPreferredLocale(request: Request): string | null {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return null;
  
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, q = '1'] = lang.trim().split(';q=');
      return { code: code.split('-')[0], quality: parseFloat(q) };
    })
    .sort((a, b) => b.quality - a.quality);
  
  for (const { code } of languages) {
    if (code in ui) {
      return code;
    }
  }
  
  return null;
}

export const onRequest = defineMiddleware((context, next) => {
  const { url, redirect, request } = context;
  const pathname = url.pathname;
  
  const pathSegments = pathname.split('/').filter(Boolean);
  const potentialLang = pathSegments[0];
  
  if (potentialLang && potentialLang.length === 2) {
    if (!(potentialLang in ui)) {
      const preferredLocale = getPreferredLocale(request);
      const targetLocale = preferredLocale || defaultLang;
      
      const restPath = pathname.slice(potentialLang.length + 1);
      const newPath = `/${targetLocale}${restPath}`;
      return redirect(newPath, 302);
    }
  }
  
  return next();
});
