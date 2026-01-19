import { db as sql, initDb } from './db';
import { getCollaboratorIds } from './collaborators';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

type MediaInput = {
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
};

export async function getUserIdByEmail(email: string) {
  await ensureDb();
  const result = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;
  return result.rows[0]?.id as number | undefined;
}

export async function upsertMedia(input: MediaInput) {
  const result = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path)
    VALUES (${input.media_id}, ${input.media_type}, ${input.title}, ${input.poster_path})
    ON CONFLICT (tmdb_id, media_type) DO UPDATE
    SET title = EXCLUDED.title,
        poster_path = EXCLUDED.poster_path,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  return result.rows[0].id as number;
}

export async function getMediaIdByTmdb(tmdbId: number, mediaType: string) {
  const result = await sql`
    SELECT id FROM media WHERE tmdb_id = ${tmdbId} AND media_type = ${mediaType}
  `;
  return result.rows[0]?.id as number | undefined;
}

export async function upsertUserMediaStatus(
  userId: number,
  mediaId: number,
  status: string,
  rating?: number | null,
  addedBy?: number
) {
  // addedBy defaults to userId if not specified
  const addedByValue = addedBy || userId;

  const result = await sql`
    INSERT INTO user_media (user_id, media_id, status, status_updated_at, rating, added_by)
    VALUES (${userId}, ${mediaId}, ${status}, CURRENT_TIMESTAMP, ${rating || null}, ${addedByValue})
    ON CONFLICT (user_id, media_id) DO UPDATE
    SET status = EXCLUDED.status,
        status_updated_at = EXCLUDED.status_updated_at,
        rating = COALESCE(EXCLUDED.rating, user_media.rating),
        added_by = COALESCE(user_media.added_by, EXCLUDED.added_by),
        updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  return result.rows[0].id as number;
}

export async function ensureUserMedia(userId: number, mediaId: number) {
  const result = await sql`
    INSERT INTO user_media (user_id, media_id)
    VALUES (${userId}, ${mediaId})
    ON CONFLICT (user_id, media_id) DO UPDATE
    SET updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `;
  return result.rows[0].id as number;
}

export async function getUserMediaId(userId: number, mediaId: number) {
  const result = await sql`
    SELECT id FROM user_media WHERE user_id = ${userId} AND media_id = ${mediaId}
  `;
  return result.rows[0]?.id as number | undefined;
}

export async function clearUserMediaStatus(userId: number, mediaId: number, status: string) {
  await sql`
    UPDATE user_media
    SET status = NULL,
        status_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId} AND media_id = ${mediaId} AND status = ${status}
  `;
}

export async function getSystemTagId(slug: string, label: string) {
  await ensureDb();

  // Check if tag exists first
  const existing = await sql`
    SELECT id FROM tags WHERE slug = ${slug} AND user_id IS NULL
  `;

  if (existing.rows[0]?.id) {
    return existing.rows[0].id as number;
  }

  // Insert if it doesn't exist
  try {
    const result = await sql`
      INSERT INTO tags (user_id, slug, label, kind)
      VALUES (NULL, ${slug}, ${label}, 'system')
      RETURNING id
    `;
    return result.rows[0]?.id as number;
  } catch {
    // Race condition - another request inserted it, fetch again
    const result = await sql`
      SELECT id FROM tags WHERE slug = ${slug} AND user_id IS NULL
    `;
    return result.rows[0]?.id as number | undefined;
  }
}

export async function addTagToUserMedia(userMediaId: number, tagId: number) {
  await sql`
    INSERT INTO user_media_tags (user_media_id, tag_id)
    VALUES (${userMediaId}, ${tagId})
    ON CONFLICT (user_media_id, tag_id) DO NOTHING
  `;
}

export async function removeTagFromUserMedia(userMediaId: number, tagId: number) {
  await sql`
    DELETE FROM user_media_tags
    WHERE user_media_id = ${userMediaId} AND tag_id = ${tagId}
  `;
}

export async function getItemsByStatus(userId: number, status: string, includeCollaborators: boolean = true) {
  // Get collaborator IDs for this list type
  let collaboratorIds: number[] = [];
  if (includeCollaborators) {
    try {
      collaboratorIds = await getCollaboratorIds(userId, status);
    } catch (e) {
      // If collaborators table doesn't exist yet, just continue without
      console.log('Collaborators not available:', e);
    }
  }

  // If no collaborators, use simple query for just the current user
  if (collaboratorIds.length === 0) {
    const result = await sql`
      SELECT
        user_media.id,
        media.tmdb_id AS media_id,
        media.media_type,
        media.title,
        media.poster_path,
        user_media.status_updated_at AS added_date,
        user_media.rating,
        user_media.user_id AS owner_id,
        user_media.added_by,
        added_by_user.name AS added_by_name,
        EXISTS (
          SELECT 1
          FROM user_media_tags
          JOIN tags ON tags.id = user_media_tags.tag_id
          WHERE user_media_tags.user_media_id = user_media.id
            AND tags.slug = 'favorites'
            AND tags.user_id IS NULL
        ) AS is_favorite
      FROM user_media
      JOIN media ON media.id = user_media.media_id
      LEFT JOIN users added_by_user ON added_by_user.id = user_media.added_by
      WHERE user_media.user_id = ${userId}
        AND user_media.status = ${status}
      ORDER BY user_media.status_updated_at DESC
    `;
    return result.rows;
  }

  // With collaborators, use string_to_array for the user IDs
  const allUserIds = [userId, ...collaboratorIds];
  const userIdList = allUserIds.join(',');

  const result = await sql`
    SELECT
      user_media.id,
      media.tmdb_id AS media_id,
      media.media_type,
      media.title,
      media.poster_path,
      user_media.status_updated_at AS added_date,
      user_media.rating,
      user_media.user_id AS owner_id,
      user_media.added_by,
      added_by_user.name AS added_by_name,
      EXISTS (
        SELECT 1
        FROM user_media_tags
        JOIN tags ON tags.id = user_media_tags.tag_id
        WHERE user_media_tags.user_media_id = user_media.id
          AND tags.slug = 'favorites'
          AND tags.user_id IS NULL
      ) AS is_favorite
    FROM user_media
    JOIN media ON media.id = user_media.media_id
    LEFT JOIN users added_by_user ON added_by_user.id = user_media.added_by
    WHERE user_media.user_id = ANY(string_to_array(${userIdList}, ',')::int[])
      AND user_media.status = ${status}
    ORDER BY user_media.status_updated_at DESC
  `;
  return result.rows;
}

export async function getItemsByTag(userId: number, tagSlug: string, includeCollaborators: boolean = true) {
  // Get collaborator IDs for this tag type
  let collaboratorIds: number[] = [];
  if (includeCollaborators) {
    try {
      collaboratorIds = await getCollaboratorIds(userId, tagSlug);
    } catch (e) {
      // If collaborators table doesn't exist yet, just continue without
      console.log('Collaborators not available:', e);
    }
  }

  // If no collaborators, use simple query for just the current user
  if (collaboratorIds.length === 0) {
    const result = await sql`
      SELECT
        user_media.id,
        media.tmdb_id AS media_id,
        media.media_type,
        media.title,
        media.poster_path,
        user_media_tags.added_at AS added_date,
        user_media.rating,
        user_media.user_id AS owner_id,
        user_media.added_by,
        added_by_user.name AS added_by_name,
        EXISTS (
          SELECT 1
          FROM user_media_tags AS favorites_tags
          JOIN tags AS favorites_tag ON favorites_tag.id = favorites_tags.tag_id
          WHERE favorites_tags.user_media_id = user_media.id
            AND favorites_tag.slug = 'favorites'
            AND favorites_tag.user_id IS NULL
        ) AS is_favorite
      FROM user_media_tags
      JOIN user_media ON user_media.id = user_media_tags.user_media_id
      JOIN media ON media.id = user_media.media_id
      JOIN tags ON tags.id = user_media_tags.tag_id
      LEFT JOIN users added_by_user ON added_by_user.id = user_media.added_by
      WHERE user_media.user_id = ${userId}
        AND tags.slug = ${tagSlug}
        AND tags.user_id IS NULL
      ORDER BY user_media_tags.added_at DESC
    `;
    return result.rows;
  }

  // With collaborators, use string_to_array for the user IDs
  const allUserIds = [userId, ...collaboratorIds];
  const userIdList = allUserIds.join(',');

  const result = await sql`
    SELECT
      user_media.id,
      media.tmdb_id AS media_id,
      media.media_type,
      media.title,
      media.poster_path,
      user_media_tags.added_at AS added_date,
      user_media.rating,
      user_media.user_id AS owner_id,
      user_media.added_by,
      added_by_user.name AS added_by_name,
      EXISTS (
        SELECT 1
        FROM user_media_tags AS favorites_tags
        JOIN tags AS favorites_tag ON favorites_tag.id = favorites_tags.tag_id
        WHERE favorites_tags.user_media_id = user_media.id
          AND favorites_tag.slug = 'favorites'
          AND favorites_tag.user_id IS NULL
      ) AS is_favorite
    FROM user_media_tags
    JOIN user_media ON user_media.id = user_media_tags.user_media_id
    JOIN media ON media.id = user_media.media_id
    JOIN tags ON tags.id = user_media_tags.tag_id
    LEFT JOIN users added_by_user ON added_by_user.id = user_media.added_by
    WHERE user_media.user_id = ANY(string_to_array(${userIdList}, ',')::int[])
      AND tags.slug = ${tagSlug}
      AND tags.user_id IS NULL
    ORDER BY user_media_tags.added_at DESC
  `;
  return result.rows;
}

export async function updateRating(userId: number, mediaId: number, rating: number | null) {
  await sql`
    UPDATE user_media
    SET rating = ${rating},
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId} AND media_id = ${mediaId}
  `;
}

export async function getRating(userId: number, tmdbId: number, mediaType: string) {
  const result = await sql`
    SELECT user_media.rating
    FROM user_media
    JOIN media ON media.id = user_media.media_id
    WHERE user_media.user_id = ${userId}
      AND media.tmdb_id = ${tmdbId}
      AND media.media_type = ${mediaType}
  `;
  return result.rows[0]?.rating as number | null;
}

export interface MediaStatus {
  status: string | null;
  tags: {
    favorites: boolean;
    rewatch: boolean;
    nostalgia: boolean;
  };
  rating: number | null;
}

export async function getMediaStatus(userId: number, tmdbId: number, mediaType: string): Promise<MediaStatus> {
  await ensureDb();

  // Get the user_media record with status and rating
  const userMediaResult = await sql`
    SELECT user_media.id, user_media.status, user_media.rating
    FROM user_media
    JOIN media ON media.id = user_media.media_id
    WHERE user_media.user_id = ${userId}
      AND media.tmdb_id = ${tmdbId}
      AND media.media_type = ${mediaType}
  `;

  const userMedia = userMediaResult.rows[0];

  if (!userMedia) {
    return {
      status: null,
      tags: { favorites: false, rewatch: false, nostalgia: false },
      rating: null,
    };
  }

  // Get tags for this user_media
  const tagsResult = await sql`
    SELECT tags.slug
    FROM user_media_tags
    JOIN tags ON tags.id = user_media_tags.tag_id
    WHERE user_media_tags.user_media_id = ${userMedia.id}
      AND tags.user_id IS NULL
      AND tags.slug IN ('favorites', 'rewatch', 'nostalgia')
  `;

  const tagSlugs = tagsResult.rows.map(r => r.slug);

  return {
    status: userMedia.status,
    tags: {
      favorites: tagSlugs.includes('favorites'),
      rewatch: tagSlugs.includes('rewatch'),
      nostalgia: tagSlugs.includes('nostalgia'),
    },
    rating: userMedia.rating,
  };
}
