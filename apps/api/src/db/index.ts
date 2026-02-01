import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Ensure data directory exists
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data/app.db';
const dbDir = dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create SQLite database
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initDatabase() {
  // Check if price_cache table exists
  const priceCacheExists = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='price_cache'"
    )
    .get();

  if (!priceCacheExists) {
    console.log('Creating price_cache table...');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS price_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id TEXT NOT NULL,
        region TEXT NOT NULL,
        currency TEXT,
        price INTEGER,
        price_formatted TEXT,
        discount INTEGER DEFAULT 0,
        price_usd REAL,
        available INTEGER DEFAULT 1,
        updated_at INTEGER
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_price_cache_app_region 
        ON price_cache(app_id, region);
    `);
    console.log('price_cache table created successfully');
  }

  // Check if game_cache table exists
  const gameCacheExists = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='game_cache'"
    )
    .get();

  if (!gameCacheExists) {
    console.log('Creating game_cache table...');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS game_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        header_image TEXT NOT NULL,
        updated_at INTEGER
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_game_cache_app_id 
        ON game_cache(app_id);
    `);
    console.log('game_cache table created successfully');
  }
}

// Initialize on import
initDatabase();

// Export schema for use in queries
export { schema };
