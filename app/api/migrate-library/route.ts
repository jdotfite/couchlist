import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { initDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { getSystemTagId } from '@/lib/library';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    await sql`
      INSERT INTO media (tmdb_id, media_type, title, poster_path)
      SELECT DISTINCT media_id, media_type, title, poster_path
      FROM watchlist
      WHERE user_id = ${userId}
      ON CONFLICT (tmdb_id, media_type) DO UPDATE
      SET title = EXCLUDED.title,
          poster_path = EXCLUDED.poster_path,
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO user_media (user_id, media_id, status, status_updated_at)
      SELECT ${userId}, media.id, 'watchlist', watchlist.added_date
      FROM watchlist
      JOIN media ON media.tmdb_id = watchlist.media_id AND media.media_type = watchlist.media_type
      WHERE watchlist.user_id = ${userId}
      ON CONFLICT (user_id, media_id) DO UPDATE
      SET status = EXCLUDED.status,
          status_updated_at = GREATEST(user_media.status_updated_at, EXCLUDED.status_updated_at),
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO media (tmdb_id, media_type, title, poster_path)
      SELECT DISTINCT media_id, media_type, title, poster_path
      FROM watched
      WHERE user_id = ${userId}
      ON CONFLICT (tmdb_id, media_type) DO UPDATE
      SET title = EXCLUDED.title,
          poster_path = EXCLUDED.poster_path,
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO user_media (user_id, media_id, status, status_updated_at, rating)
      SELECT ${userId}, media.id, 'finished', watched.watched_date, watched.rating
      FROM watched
      JOIN media ON media.tmdb_id = watched.media_id AND media.media_type = watched.media_type
      WHERE watched.user_id = ${userId}
      ON CONFLICT (user_id, media_id) DO UPDATE
      SET status = EXCLUDED.status,
          status_updated_at = GREATEST(user_media.status_updated_at, EXCLUDED.status_updated_at),
          rating = COALESCE(EXCLUDED.rating, user_media.rating),
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO media (tmdb_id, media_type, title, poster_path)
      SELECT DISTINCT media_id, media_type, title, poster_path
      FROM watching
      WHERE user_id = ${userId}
      ON CONFLICT (tmdb_id, media_type) DO UPDATE
      SET title = EXCLUDED.title,
          poster_path = EXCLUDED.poster_path,
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO user_media (user_id, media_id, status, status_updated_at)
      SELECT ${userId}, media.id, 'watching', watching.added_date
      FROM watching
      JOIN media ON media.tmdb_id = watching.media_id AND media.media_type = watching.media_type
      WHERE watching.user_id = ${userId}
      ON CONFLICT (user_id, media_id) DO UPDATE
      SET status = EXCLUDED.status,
          status_updated_at = GREATEST(user_media.status_updated_at, EXCLUDED.status_updated_at),
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO media (tmdb_id, media_type, title, poster_path)
      SELECT DISTINCT media_id, media_type, title, poster_path
      FROM onhold
      WHERE user_id = ${userId}
      ON CONFLICT (tmdb_id, media_type) DO UPDATE
      SET title = EXCLUDED.title,
          poster_path = EXCLUDED.poster_path,
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO user_media (user_id, media_id, status, status_updated_at)
      SELECT ${userId}, media.id, 'onhold', onhold.added_date
      FROM onhold
      JOIN media ON media.tmdb_id = onhold.media_id AND media.media_type = onhold.media_type
      WHERE onhold.user_id = ${userId}
      ON CONFLICT (user_id, media_id) DO UPDATE
      SET status = EXCLUDED.status,
          status_updated_at = GREATEST(user_media.status_updated_at, EXCLUDED.status_updated_at),
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO media (tmdb_id, media_type, title, poster_path)
      SELECT DISTINCT media_id, media_type, title, poster_path
      FROM dropped
      WHERE user_id = ${userId}
      ON CONFLICT (tmdb_id, media_type) DO UPDATE
      SET title = EXCLUDED.title,
          poster_path = EXCLUDED.poster_path,
          updated_at = CURRENT_TIMESTAMP
    `;

    await sql`
      INSERT INTO user_media (user_id, media_id, status, status_updated_at)
      SELECT ${userId}, media.id, 'dropped', dropped.added_date
      FROM dropped
      JOIN media ON media.tmdb_id = dropped.media_id AND media.media_type = dropped.media_type
      WHERE dropped.user_id = ${userId}
      ON CONFLICT (user_id, media_id) DO UPDATE
      SET status = EXCLUDED.status,
          status_updated_at = GREATEST(user_media.status_updated_at, EXCLUDED.status_updated_at),
          updated_at = CURRENT_TIMESTAMP
    `;

    const favoritesTagId = await getSystemTagId('favorites', 'Favorites');
    const rewatchTagId = await getSystemTagId('rewatch', 'Rewatch');
    const nostalgiaTagId = await getSystemTagId('nostalgia', 'Nostalgia');

    if (favoritesTagId) {
      await sql`
        INSERT INTO media (tmdb_id, media_type, title, poster_path)
        SELECT DISTINCT media_id, media_type, title, poster_path
        FROM favorites
        WHERE user_id = ${userId}
        ON CONFLICT (tmdb_id, media_type) DO UPDATE
        SET title = EXCLUDED.title,
            poster_path = EXCLUDED.poster_path,
            updated_at = CURRENT_TIMESTAMP
      `;

      await sql`
        INSERT INTO user_media (user_id, media_id)
        SELECT ${userId}, media.id
        FROM favorites
        JOIN media ON media.tmdb_id = favorites.media_id AND media.media_type = favorites.media_type
        WHERE favorites.user_id = ${userId}
        ON CONFLICT (user_id, media_id) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
      `;

      await sql`
        INSERT INTO user_media_tags (user_media_id, tag_id, added_at)
        SELECT user_media.id, ${favoritesTagId}, favorites.added_date
        FROM favorites
        JOIN media ON media.tmdb_id = favorites.media_id AND media.media_type = favorites.media_type
        JOIN user_media ON user_media.user_id = ${userId} AND user_media.media_id = media.id
        WHERE favorites.user_id = ${userId}
        ON CONFLICT (user_media_id, tag_id) DO NOTHING
      `;
    }

    if (rewatchTagId) {
      await sql`
        INSERT INTO media (tmdb_id, media_type, title, poster_path)
        SELECT DISTINCT media_id, media_type, title, poster_path
        FROM rewatch
        WHERE user_id = ${userId}
        ON CONFLICT (tmdb_id, media_type) DO UPDATE
        SET title = EXCLUDED.title,
            poster_path = EXCLUDED.poster_path,
            updated_at = CURRENT_TIMESTAMP
      `;

      await sql`
        INSERT INTO user_media (user_id, media_id)
        SELECT ${userId}, media.id
        FROM rewatch
        JOIN media ON media.tmdb_id = rewatch.media_id AND media.media_type = rewatch.media_type
        WHERE rewatch.user_id = ${userId}
        ON CONFLICT (user_id, media_id) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
      `;

      await sql`
        INSERT INTO user_media_tags (user_media_id, tag_id, added_at)
        SELECT user_media.id, ${rewatchTagId}, rewatch.added_date
        FROM rewatch
        JOIN media ON media.tmdb_id = rewatch.media_id AND media.media_type = rewatch.media_type
        JOIN user_media ON user_media.user_id = ${userId} AND user_media.media_id = media.id
        WHERE rewatch.user_id = ${userId}
        ON CONFLICT (user_media_id, tag_id) DO NOTHING
      `;
    }

    if (nostalgiaTagId) {
      await sql`
        INSERT INTO media (tmdb_id, media_type, title, poster_path)
        SELECT DISTINCT media_id, media_type, title, poster_path
        FROM nostalgia
        WHERE user_id = ${userId}
        ON CONFLICT (tmdb_id, media_type) DO UPDATE
        SET title = EXCLUDED.title,
            poster_path = EXCLUDED.poster_path,
            updated_at = CURRENT_TIMESTAMP
      `;

      await sql`
        INSERT INTO user_media (user_id, media_id)
        SELECT ${userId}, media.id
        FROM nostalgia
        JOIN media ON media.tmdb_id = nostalgia.media_id AND media.media_type = nostalgia.media_type
        WHERE nostalgia.user_id = ${userId}
        ON CONFLICT (user_id, media_id) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
      `;

      await sql`
        INSERT INTO user_media_tags (user_media_id, tag_id, added_at)
        SELECT user_media.id, ${nostalgiaTagId}, nostalgia.added_date
        FROM nostalgia
        JOIN media ON media.tmdb_id = nostalgia.media_id AND media.media_type = nostalgia.media_type
        JOIN user_media ON user_media.user_id = ${userId} AND user_media.media_id = media.id
        WHERE nostalgia.user_id = ${userId}
        ON CONFLICT (user_media_id, tag_id) DO NOTHING
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
