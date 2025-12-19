import { Hono } from 'hono';
import { authRoutes } from './auth';
import { pricesRoutes } from './prices';

export const steamRoutes = new Hono();

// Mount sub-routes
steamRoutes.route('/auth', authRoutes);
steamRoutes.route('/prices', pricesRoutes);

// Steam API info
steamRoutes.get('/', (c) => {
  return c.json({
    name: 'Steam API',
    endpoints: ['/auth', '/auth/callback', '/prices'],
  });
});
