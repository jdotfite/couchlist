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
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        tmdb_id INTEGER NOT NULL,
        media_type TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tmdb_id, media_type)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_media (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        media_id INTEGER NOT NULL,
        status TEXT,
        status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rating INTEGER,
        notes TEXT,
        progress INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (media_id) REFERENCES media(id),
        UNIQUE(user_id, media_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        slug TEXT NOT NULL,
        label TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_media_tags (
        id SERIAL PRIMARY KEY,
        user_media_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_media_id) REFERENCES user_media(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id),
        UNIQUE(user_media_id, tag_id)
      );
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS tags_system_slug_unique
      ON tags (slug)
      WHERE user_id IS NULL;
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS tags_user_slug_unique
      ON tags (user_id, slug)
      WHERE user_id IS NOT NULL;
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS user_media_status_idx
      ON user_media (user_id, status, status_updated_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS user_media_tags_tag_idx
      ON user_media_tags (tag_id, added_at DESC);
    `;

    // Collaborators table - links users who share lists
    await sql`
      CREATE TABLE IF NOT EXISTS collaborators (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        collaborator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        invite_code VARCHAR(32) UNIQUE NOT NULL,
        invite_expires_at TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        UNIQUE(owner_id, collaborator_id)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_collaborators_invite_code
      ON collaborators(invite_code);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_collaborators_owner
      ON collaborators(owner_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_collaborators_collaborator
      ON collaborators(collaborator_id);
    `;

    // Shared lists config - which lists are shared between collaborators
    await sql`
      CREATE TABLE IF NOT EXISTS shared_lists (
        id SERIAL PRIMARY KEY,
        collaborator_id INTEGER NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
        list_type VARCHAR(30) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collaborator_id, list_type)
      );
    `;

    // Add added_by column to user_media if it doesn't exist
    try {
      await sql`
        ALTER TABLE user_media
        ADD COLUMN IF NOT EXISTS added_by INTEGER REFERENCES users(id);
      `;
    } catch (e) {
      // Column might already exist
    }

    // Backfill added_by with user_id where null
    await sql`
      UPDATE user_media SET added_by = user_id WHERE added_by IS NULL;
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_media_added_by
      ON user_media(added_by);
    `;

    // Insert system tags individually to handle partial index conflicts
    const systemTags = [
      { slug: 'favorites', label: 'Favorites' },
      { slug: 'rewatch', label: 'Rewatch' },
      { slug: 'nostalgia', label: 'Classics' },
    ];

    for (const tag of systemTags) {
      const existing = await sql`
        SELECT id FROM tags WHERE slug = ${tag.slug} AND user_id IS NULL
      `;
      if (!existing.rows[0]) {
        await sql`
          INSERT INTO tags (user_id, slug, label, kind)
          VALUES (NULL, ${tag.slug}, ${tag.label}, 'system')
        `;
      }
    }
  } catch (error) {
    // Tables already exist, ignore
    console.log('Database tables already initialized');
  }
}

export { sql as db };
