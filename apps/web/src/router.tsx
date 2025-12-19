import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Footer } from './components/common/Footer';
import { Header } from './components/common/Header';
import { getLanguageFromPath } from './i18n';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const SteamPage = lazy(() => import('./pages/SteamPage').then((m) => ({ default: m.SteamPage })));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Root layout
function RootLayout() {
  const { i18n } = useTranslation();

  // Sync language with URL
  useEffect(() => {
    const lang = getLanguageFromPath(window.location.pathname);
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

// === Routes ===

const rootRoute = createRootRoute({
  component: RootLayout,
});

// RU routes (default, no prefix)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const steamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/steam',
  component: SteamPage,
});

// EN routes
const enIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/en',
  component: HomePage,
});

const enSteamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/en/steam',
  component: SteamPage,
});

// 404 route
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-muted-foreground">Страница не найдена / Page not found</p>
    </div>
  ),
});

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  steamRoute,
  enIndexRoute,
  enSteamRoute,
  notFoundRoute,
]);

// Create and export router
export const router = createRouter({ routeTree });

// Type registration for useNavigate, Link, etc.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
