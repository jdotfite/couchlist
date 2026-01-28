import { db as sql, initDb } from './db';
import type { List } from './lists';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

/**
 * Filter rules for smart lists
 */
export interface FilterRules {
  // Status (OR - any of these)
  status?: ('watchlist' | 'watching' | 'watched' | 'finished')[];

  // Media type
  mediaType?: ('movie' | 'tv')[];

  // Year watched (when user marked as watched)
  watchedYear?: number;

  // Release year range
  releaseYearMin?: number;
  releaseYearMax?: number;

  // User rating (minimum)
  ratingMin?: number;

  // Labels/tags (AND - must have all)
  labels?: string[];

  // Labels (OR - must have at least one)
  labelsAny?: string[];

  // Favorite flag shortcut
  isFavorite?: boolean;

  // Genre IDs (OR - any of these)
  genres?: number[];
}

/**
 * Resolved item from a list
 */
export interface ResolvedItem {
  id: number;
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  status: string | null;
  rating: number | null;
  watchedYear: number | null;
  statusUpdatedAt: Date | null;
  isPinned: boolean;
  isFavorite: boolean;
}

/**
 * Resolve a list to its items by executing the filter query
 */
export async function resolveList(
  userId: number,
  list: List
): Promise<ResolvedItem[]> {
  await ensureDb();

  const { filterRules, sortBy, sortDirection, itemLimit, listType, id: listId } = list;

  // For manual lists, just get pinned items
  if (listType === 'manual') {
    return getManualListItems(userId, listId, sortBy, sortDirection, itemLimit);
  }

  // Build the filter query for smart/hybrid lists
  const items = await executeFilterQuery(
    userId,
    filterRules,
    sortBy,
    sortDirection,
    itemLimit,
    listId,
    listType === 'hybrid'
  );

  return items;
}

/**
 * Get items for a manual list (only pinned items)
 */
async function getManualListItems(
  userId: number,
  listId: number,
  sortBy: string,
  sortDirection: 'asc' | 'desc',
  itemLimit: number
): Promise<ResolvedItem[]> {
  const orderClause = getOrderClause(sortBy, sortDirection);
  const limitClause = itemLimit > 0 ? `LIMIT ${itemLimit}` : '';

  const result = await sql.query(`
    SELECT
      um.id,
      um.media_id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.poster_path,
      m.release_year,
      um.status,
      um.rating,
      um.watched_year,
      um.status_updated_at,
      TRUE as is_pinned,
      EXISTS (
        SELECT 1 FROM user_media_tags umt
        JOIN tags t ON t.id = umt.tag_id
        WHERE umt.user_media_id = um.id
          AND t.slug = 'favorites'
          AND t.user_id IS NULL
      ) as is_favorite
    FROM saved_list_pins slp
    JOIN media m ON m.id = slp.media_id
    LEFT JOIN user_media um ON um.media_id = m.id AND um.user_id = $1
    WHERE slp.saved_list_id = $2 AND slp.pin_type = 'include'
    ORDER BY slp.position ASC
    ${limitClause}
  `, [userId, listId]);

  return result.rows.map(mapRowToItem);
}

/**
 * Execute filter query for smart/hybrid lists
 */
async function executeFilterQuery(
  userId: number,
  rules: FilterRules,
  sortBy: string,
  sortDirection: 'asc' | 'desc',
  itemLimit: number,
  listId: number,
  includeManualPins: boolean
): Promise<ResolvedItem[]> {
  const conditions: string[] = ['um.user_id = $1'];
  const params: (string | number | number[])[] = [userId];
  let paramIndex = 2;

  // Status filter (OR)
  if (rules.status && rules.status.length > 0) {
    // Normalize 'watched' to 'finished' for consistency
    const statuses = rules.status.map(s => s === 'watched' ? 'finished' : s);
    conditions.push(`um.status = ANY($${paramIndex}::text[])`);
    params.push(statuses as unknown as string);
    paramIndex++;
  }

  // Media type filter (OR)
  if (rules.mediaType && rules.mediaType.length > 0) {
    conditions.push(`m.media_type = ANY($${paramIndex}::text[])`);
    params.push(rules.mediaType as unknown as string);
    paramIndex++;
  }

  // Watched year filter
  if (rules.watchedYear !== undefined) {
    conditions.push(`um.watched_year = $${paramIndex}`);
    params.push(rules.watchedYear);
    paramIndex++;
  }

  // Release year range
  if (rules.releaseYearMin !== undefined) {
    conditions.push(`m.release_year >= $${paramIndex}`);
    params.push(rules.releaseYearMin);
    paramIndex++;
  }

  if (rules.releaseYearMax !== undefined) {
    conditions.push(`m.release_year <= $${paramIndex}`);
    params.push(rules.releaseYearMax);
    paramIndex++;
  }

  // Rating minimum
  if (rules.ratingMin !== undefined) {
    conditions.push(`um.rating >= $${paramIndex}`);
    params.push(rules.ratingMin);
    paramIndex++;
  }

  // Favorite filter
  if (rules.isFavorite === true) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM user_media_tags umt
        JOIN tags t ON t.id = umt.tag_id
        WHERE umt.user_media_id = um.id
          AND t.slug = 'favorites'
          AND t.user_id IS NULL
      )
    `);
  }

  // Labels (AND - must have all)
  if (rules.labels && rules.labels.length > 0) {
    for (const label of rules.labels) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM user_media_tags umt
          JOIN tags t ON t.id = umt.tag_id
          WHERE umt.user_media_id = um.id
            AND t.slug = $${paramIndex}
        )
      `);
      params.push(label);
      paramIndex++;
    }
  }

  // Labels (OR - must have at least one)
  if (rules.labelsAny && rules.labelsAny.length > 0) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM user_media_tags umt
        JOIN tags t ON t.id = umt.tag_id
        WHERE umt.user_media_id = um.id
          AND t.slug = ANY($${paramIndex}::text[])
      )
    `);
    params.push(rules.labelsAny as unknown as string);
    paramIndex++;
  }

  // Genre filter (OR)
  if (rules.genres && rules.genres.length > 0) {
    // genre_ids is stored as comma-separated string
    const genreConditions = rules.genres.map((_, i) =>
      `m.genre_ids LIKE '%' || $${paramIndex + i} || '%'`
    ).join(' OR ');
    conditions.push(`(${genreConditions})`);
    for (const genre of rules.genres) {
      params.push(genre.toString());
      paramIndex++;
    }
  }

  // Exclude manually excluded items for hybrid lists
  if (includeManualPins) {
    conditions.push(`
      NOT EXISTS (
        SELECT 1 FROM saved_list_pins slp
        WHERE slp.saved_list_id = $${paramIndex}
          AND slp.media_id = m.id
          AND slp.pin_type = 'exclude'
      )
    `);
    params.push(listId);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');
  const orderClause = getOrderClause(sortBy, sortDirection);
  const limitClause = itemLimit > 0 ? `LIMIT ${itemLimit}` : '';

  // Main query for filtered items
  const query = `
    SELECT
      um.id,
      um.media_id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.poster_path,
      m.release_year,
      um.status,
      um.rating,
      um.watched_year,
      um.status_updated_at,
      FALSE as is_pinned,
      EXISTS (
        SELECT 1 FROM user_media_tags umt
        JOIN tags t ON t.id = umt.tag_id
        WHERE umt.user_media_id = um.id
          AND t.slug = 'favorites'
          AND t.user_id IS NULL
      ) as is_favorite
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE ${whereClause}
    ${orderClause}
    ${limitClause}
  `;

  const result = await sql.query(query, params);
  let items = result.rows.map(mapRowToItem);

  // For hybrid lists, prepend manually pinned items
  if (includeManualPins) {
    const pinnedResult = await sql.query(`
      SELECT
        um.id,
        um.media_id,
        m.tmdb_id,
        m.media_type,
        m.title,
        m.poster_path,
        m.release_year,
        um.status,
        um.rating,
        um.watched_year,
        um.status_updated_at,
        TRUE as is_pinned,
        EXISTS (
          SELECT 1 FROM user_media_tags umt
          JOIN tags t ON t.id = umt.tag_id
          WHERE umt.user_media_id = um.id
            AND t.slug = 'favorites'
            AND t.user_id IS NULL
        ) as is_favorite
      FROM saved_list_pins slp
      JOIN media m ON m.id = slp.media_id
      LEFT JOIN user_media um ON um.media_id = m.id AND um.user_id = $1
      WHERE slp.saved_list_id = $2 AND slp.pin_type = 'include'
      ORDER BY slp.position ASC
    `, [userId, listId]);

    const pinnedItems = pinnedResult.rows.map(mapRowToItem);
    const pinnedMediaIds = new Set(pinnedItems.map(p => p.mediaId));

    // Remove pinned items from filtered results to avoid duplicates
    items = items.filter(i => !pinnedMediaIds.has(i.mediaId));

    // Prepend pinned items
    items = [...pinnedItems, ...items];

    // Apply limit after combining
    if (itemLimit > 0) {
      items = items.slice(0, itemLimit);
    }
  }

  return items;
}

/**
 * Get ORDER BY clause for sorting
 */
function getOrderClause(sortBy: string, direction: 'asc' | 'desc'): string {
  const dir = direction.toUpperCase();

  switch (sortBy) {
    case 'title':
      return `ORDER BY m.title ${dir}`;
    case 'release_year':
      return `ORDER BY m.release_year ${dir} NULLS LAST, m.title ASC`;
    case 'rating':
      return `ORDER BY um.rating ${dir} NULLS LAST, um.status_updated_at DESC`;
    case 'watched_year':
      return `ORDER BY um.watched_year ${dir} NULLS LAST, um.status_updated_at DESC`;
    case 'status_updated_at':
    default:
      return `ORDER BY um.status_updated_at ${dir} NULLS LAST`;
  }
}

/**
 * Map database row to ResolvedItem
 */
function mapRowToItem(row: Record<string, unknown>): ResolvedItem {
  return {
    id: row.id as number,
    mediaId: row.media_id as number,
    tmdbId: row.tmdb_id as number,
    mediaType: row.media_type as 'movie' | 'tv',
    title: row.title as string,
    posterPath: row.poster_path as string | null,
    releaseYear: row.release_year as number | null,
    status: row.status as string | null,
    rating: row.rating as number | null,
    watchedYear: row.watched_year as number | null,
    statusUpdatedAt: row.status_updated_at ? new Date(row.status_updated_at as string) : null,
    isPinned: row.is_pinned as boolean,
    isFavorite: row.is_favorite as boolean,
  };
}

/**
 * Preview a filter (execute without saving as a list)
 */
export async function previewFilter(
  userId: number,
  rules: FilterRules,
  sortBy: string = 'status_updated_at',
  sortDirection: 'asc' | 'desc' = 'desc',
  limit: number = 50
): Promise<ResolvedItem[]> {
  await ensureDb();

  // Use a dummy list ID that doesn't exist
  return executeFilterQuery(userId, rules, sortBy, sortDirection, limit, -1, false);
}

/**
 * Get count of items that match a filter
 */
export async function countFilterMatches(
  userId: number,
  rules: FilterRules
): Promise<number> {
  await ensureDb();

  const conditions: string[] = ['um.user_id = $1'];
  const params: (string | number | number[])[] = [userId];
  let paramIndex = 2;

  // Status filter
  if (rules.status && rules.status.length > 0) {
    const statuses = rules.status.map(s => s === 'watched' ? 'finished' : s);
    conditions.push(`um.status = ANY($${paramIndex}::text[])`);
    params.push(statuses as unknown as string);
    paramIndex++;
  }

  // Media type filter
  if (rules.mediaType && rules.mediaType.length > 0) {
    conditions.push(`m.media_type = ANY($${paramIndex}::text[])`);
    params.push(rules.mediaType as unknown as string);
    paramIndex++;
  }

  // Watched year filter
  if (rules.watchedYear !== undefined) {
    conditions.push(`um.watched_year = $${paramIndex}`);
    params.push(rules.watchedYear);
    paramIndex++;
  }

  // Release year range
  if (rules.releaseYearMin !== undefined) {
    conditions.push(`m.release_year >= $${paramIndex}`);
    params.push(rules.releaseYearMin);
    paramIndex++;
  }

  if (rules.releaseYearMax !== undefined) {
    conditions.push(`m.release_year <= $${paramIndex}`);
    params.push(rules.releaseYearMax);
    paramIndex++;
  }

  // Rating minimum
  if (rules.ratingMin !== undefined) {
    conditions.push(`um.rating >= $${paramIndex}`);
    params.push(rules.ratingMin);
    paramIndex++;
  }

  // Favorite filter
  if (rules.isFavorite === true) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM user_media_tags umt
        JOIN tags t ON t.id = umt.tag_id
        WHERE umt.user_media_id = um.id
          AND t.slug = 'favorites'
          AND t.user_id IS NULL
      )
    `);
  }

  const whereClause = conditions.join(' AND ');

  const result = await sql.query(`
    SELECT COUNT(*) as count
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE ${whereClause}
  `, params);

  return parseInt(result.rows[0].count, 10);
}
