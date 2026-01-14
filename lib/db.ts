import { sql } from '@vercel/postgres';

// Initialize database schema - runs automatically when imported
export async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS watched (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        media_id INTEGER NOT NULL,
        media_type TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        watched_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rating INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, media_id, media_type)
      );
    `;
  } catch (error) {
    // Tables already exist, ignore
    console.log('Database tables already initialized');
  }
}

export { sql as db };
