import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Cached prices table
export const priceCache = sqliteTable('price_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  appId: text('app_id').notNull(),
  region: text('region').notNull(),
  currency: text('currency'),
  price: integer('price'), // Price in cents
  priceFormatted: text('price_formatted'),
  discount: integer('discount').default(0),
  priceUsd: real('price_usd'), // For comparison
  available: integer('available', { mode: 'boolean' }).default(true),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Cached game details table
export const gameCache = sqliteTable('game_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  appId: text('app_id').notNull().unique(),
  name: text('name').notNull(),
  headerImage: text('header_image').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Create unique index for app_id + region
export type PriceCache = typeof priceCache.$inferSelect;
export type NewPriceCache = typeof priceCache.$inferInsert;
export type GameCache = typeof gameCache.$inferSelect;
export type NewGameCache = typeof gameCache.$inferInsert;
