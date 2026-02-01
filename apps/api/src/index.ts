import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { healthRoutes } from './routes/health';
import { steamRoutes } from './routes/steam';

// Create app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Routes
app.route('/api/health', healthRoutes);
app.route('/api/steam', steamRoutes);

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'Tarmaks API',
    version: '0.1.0',
    status: 'running',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Export app type for client
export type AppType = typeof app;

// Start server
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || 'localhost';

console.log(`🚀 Server starting on http://${host}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});
