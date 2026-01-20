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

    // User list preferences - custom names for system lists
    await sql`
      CREATE TABLE IF NOT EXISTS user_list_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        list_type VARCHAR(30) NOT NULL,
        display_name VARCHAR(50),
        is_hidden BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, list_type)
      );
    `;

    // Add is_hidden column if it doesn't exist (migration for existing tables)
    try {
      await sql`
        ALTER TABLE user_list_preferences
        ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
      `;
    } catch (e) {
      // Column might already exist
    }

    // Allow display_name to be null (for hide-only preferences)
    try {
      await sql`
        ALTER TABLE user_list_preferences
        ALTER COLUMN display_name DROP NOT NULL;
      `;
    } catch (e) {
      // Might already be nullable
    }

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_list_preferences_user
      ON user_list_preferences(user_id);
    `;

    // Custom lists - user-created lists beyond system defaults
    await sql`
      CREATE TABLE IF NOT EXISTS custom_lists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug VARCHAR(50) NOT NULL,
        name VARCHAR(50) NOT NULL,
        description VARCHAR(200),
        icon VARCHAR(30) DEFAULT 'list',
        color VARCHAR(20) DEFAULT 'gray',
        is_shared BOOLEAN DEFAULT false,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, slug)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_custom_lists_user
      ON custom_lists(user_id);
    `;

    // Custom list items - junction table linking media to custom lists
    await sql`
      CREATE TABLE IF NOT EXISTS custom_list_items (
        id SERIAL PRIMARY KEY,
        custom_list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
        media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        added_by INTEGER REFERENCES users(id),
        notes VARCHAR(500),
        position INTEGER DEFAULT 0,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(custom_list_id, media_id)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_custom_list_items_list
      ON custom_list_items(custom_list_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_custom_list_items_media
      ON custom_list_items(media_id);
    `;

    // Custom list collaborators - links users who share custom lists
    await sql`
      CREATE TABLE IF NOT EXISTS custom_list_collaborators (
        id SERIAL PRIMARY KEY,
        custom_list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'collaborator',
        invite_code VARCHAR(32) UNIQUE,
        invite_expires_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(custom_list_id, user_id)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_custom_list_collaborators_list
      ON custom_list_collaborators(custom_list_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_custom_list_collaborators_user
      ON custom_list_collaborators(user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_custom_list_collaborators_invite
      ON custom_list_collaborators(invite_code);
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

    // Add username column to users if it doesn't exist
    try {
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;
      `;
    } catch (e) {
      // Column might already exist
    }

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_username
      ON users(username);
    `;

    // User privacy settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_privacy_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discoverability VARCHAR(20) DEFAULT 'everyone',
        show_in_search BOOLEAN DEFAULT true,
        allow_invites_from VARCHAR(20) DEFAULT 'everyone',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user
      ON user_privacy_settings(user_id);
    `;

    // Add invited_by and invite_message columns to custom_list_collaborators
    try {
      await sql`
        ALTER TABLE custom_list_collaborators
        ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id);
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE custom_list_collaborators
        ADD COLUMN IF NOT EXISTS invite_message VARCHAR(200);
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE custom_list_collaborators
        ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP;
      `;
    } catch (e) {
      // Column might already exist
    }

    // Add genre_ids and release_year to media table for filtering
    try {
      await sql`
        ALTER TABLE media
        ADD COLUMN IF NOT EXISTS genre_ids TEXT;
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE media
        ADD COLUMN IF NOT EXISTS release_year INTEGER;
      `;
    } catch (e) {
      // Column might already exist
    }

    await sql`
      CREATE INDEX IF NOT EXISTS idx_media_release_year
      ON media(release_year);
    `;

    // User episodes table - tracks individual episode watch status
    await sql`
      CREATE TABLE IF NOT EXISTS user_episodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        season_number INTEGER NOT NULL,
        episode_number INTEGER NOT NULL,
        tmdb_episode_id INTEGER,
        status VARCHAR(20) DEFAULT 'watched',
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        notes TEXT,
        watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, media_id, season_number, episode_number)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_episodes_user_media
      ON user_episodes(user_id, media_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_episodes_season
      ON user_episodes(user_id, media_id, season_number);
    `;

    // Add episode tracking columns to user_media if they don't exist
    try {
      await sql`
        ALTER TABLE user_media
        ADD COLUMN IF NOT EXISTS current_season INTEGER DEFAULT 1;
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE user_media
        ADD COLUMN IF NOT EXISTS current_episode INTEGER DEFAULT 0;
      `;
    } catch (e) {
      // Column might already exist
    }

    try {
      await sql`
        ALTER TABLE user_media
        ADD COLUMN IF NOT EXISTS total_episodes_watched INTEGER DEFAULT 0;
      `;
    } catch (e) {
      // Column might already exist
    }

    // Import jobs table - tracks bulk import operations
    await sql`
      CREATE TABLE IF NOT EXISTS import_jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source VARCHAR(30) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        total_items INTEGER DEFAULT 0,
        processed_items INTEGER DEFAULT 0,
        successful_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        skipped_items INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_user
      ON import_jobs(user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_status
      ON import_jobs(status);
    `;

    // Import job items table - tracks individual item results
    await sql`
      CREATE TABLE IF NOT EXISTS import_job_items (
        id SERIAL PRIMARY KEY,
        import_job_id INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
        source_title VARCHAR(500) NOT NULL,
        source_year INTEGER,
        source_rating DECIMAL(3,1),
        source_status VARCHAR(30),
        tmdb_id INTEGER,
        matched_title VARCHAR(500),
        match_confidence VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        result_action VARCHAR(30),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_import_job_items_job
      ON import_job_items(import_job_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_import_job_items_status
      ON import_job_items(status);
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
