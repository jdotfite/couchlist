import { db as sql, initDb } from './db';
import { resolveList, type FilterRules, type ResolvedItem } from './list-resolver';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

export interface List {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  listType: 'smart' | 'manual' | 'hybrid';
  filterRules: FilterRules;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  itemLimit: number;
  isPublic: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
}

export interface CreateListInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  listType?: 'smart' | 'manual' | 'hybrid';
  filterRules?: FilterRules;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  itemLimit?: number;
}

export interface UpdateListInput {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  listType?: 'smart' | 'manual' | 'hybrid';
  filterRules?: FilterRules;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  itemLimit?: number;
  isPublic?: boolean;
  position?: number;
}

// Available sort options
export const SORT_OPTIONS = [
  { value: 'status_updated_at', label: 'Date Added' },
  { value: 'title', label: 'Title' },
  { value: 'release_year', label: 'Release Year' },
  { value: 'rating', label: 'Your Rating' },
  { value: 'watched_year', label: 'Year Watched' },
] as const;

// Available colors
export const LIST_COLORS = [
  'gray', 'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const;

// Available icons
export const LIST_ICONS = [
  'list', 'star', 'heart', 'bookmark', 'folder', 'film',
  'tv', 'trophy', 'crown', 'flame', 'sparkles', 'zap',
  'clock', 'calendar', 'eye', 'play', 'check', 'flag',
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Get all lists for a user
 */
export async function getLists(userId: number): Promise<List[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      sl.*,
      (
        SELECT COUNT(*)
        FROM saved_list_pins slp
        WHERE slp.saved_list_id = sl.id AND slp.pin_type = 'include'
      ) as pin_count
    FROM saved_lists sl
    WHERE sl.user_id = ${userId}
    ORDER BY sl.position ASC, sl.created_at DESC
  `;

  return result.rows.map(mapRowToList);
}

/**
 * Get a single list by ID
 */
export async function getListById(
  userId: number,
  listId: number
): Promise<List | null> {
  await ensureDb();

  const result = await sql`
    SELECT * FROM saved_lists
    WHERE id = ${listId} AND user_id = ${userId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToList(result.rows[0]);
}

/**
 * Get a list by slug
 */
export async function getListBySlug(
  userId: number,
  slug: string
): Promise<List | null> {
  await ensureDb();

  const result = await sql`
    SELECT * FROM saved_lists
    WHERE slug = ${slug} AND user_id = ${userId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToList(result.rows[0]);
}

/**
 * Create a new list
 */
export async function createList(
  userId: number,
  input: CreateListInput
): Promise<List> {
  await ensureDb();

  // Generate slug
  const slug = slugify(input.name);
  if (!slug) {
    throw new Error('Invalid list name');
  }

  // Check for duplicate slug
  const existing = await sql`
    SELECT id FROM saved_lists
    WHERE slug = ${slug} AND user_id = ${userId}
  `;

  if (existing.rows.length > 0) {
    throw new Error('A list with this name already exists');
  }

  // Get next position
  const positionResult = await sql`
    SELECT COALESCE(MAX(position), -1) + 1 as next_position
    FROM saved_lists
    WHERE user_id = ${userId}
  `;
  const nextPosition = positionResult.rows[0].next_position;

  const filterRulesJson = JSON.stringify(input.filterRules || {});

  const result = await sql`
    INSERT INTO saved_lists (
      user_id, slug, name, description, icon, color,
      list_type, filter_rules, sort_by, sort_direction,
      item_limit, position
    )
    VALUES (
      ${userId},
      ${slug},
      ${input.name.trim()},
      ${input.description?.trim() || null},
      ${input.icon || 'list'},
      ${input.color || 'gray'},
      ${input.listType || 'smart'},
      ${filterRulesJson}::jsonb,
      ${input.sortBy || 'status_updated_at'},
      ${input.sortDirection || 'desc'},
      ${input.itemLimit || 0},
      ${nextPosition}
    )
    RETURNING *
  `;

  return mapRowToList(result.rows[0]);
}

/**
 * Update a list
 */
export async function updateList(
  userId: number,
  listId: number,
  input: UpdateListInput
): Promise<List> {
  await ensureDb();

  // Check if list exists
  const existing = await getListById(userId, listId);
  if (!existing) {
    throw new Error('List not found');
  }

  // If name is changing, check for duplicate slug
  if (input.name !== undefined) {
    const newSlug = slugify(input.name);
    if (!newSlug) {
      throw new Error('Invalid list name');
    }

    const duplicate = await sql`
      SELECT id FROM saved_lists
      WHERE slug = ${newSlug} AND user_id = ${userId} AND id != ${listId}
    `;

    if (duplicate.rows.length > 0) {
      throw new Error('A list with this name already exists');
    }
  }

  const newSlug = input.name ? slugify(input.name) : existing.slug;
  const filterRulesJson = input.filterRules
    ? JSON.stringify(input.filterRules)
    : null;

  await sql`
    UPDATE saved_lists
    SET
      slug = ${newSlug},
      name = COALESCE(${input.name?.trim() || null}, name),
      description = CASE
        WHEN ${input.description !== undefined} THEN ${input.description?.trim() || null}
        ELSE description
      END,
      icon = COALESCE(${input.icon || null}, icon),
      color = COALESCE(${input.color || null}, color),
      list_type = COALESCE(${input.listType || null}, list_type),
      filter_rules = CASE
        WHEN ${filterRulesJson !== null} THEN ${filterRulesJson}::jsonb
        ELSE filter_rules
      END,
      sort_by = COALESCE(${input.sortBy || null}, sort_by),
      sort_direction = COALESCE(${input.sortDirection || null}, sort_direction),
      item_limit = COALESCE(${input.itemLimit ?? null}, item_limit),
      is_public = COALESCE(${input.isPublic ?? null}, is_public),
      position = COALESCE(${input.position ?? null}, position),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${listId}
  `;

  return (await getListById(userId, listId))!;
}

/**
 * Delete a list
 */
export async function deleteList(userId: number, listId: number): Promise<void> {
  await ensureDb();

  const result = await sql`
    DELETE FROM saved_lists
    WHERE id = ${listId} AND user_id = ${userId}
    RETURNING id
  `;

  if (result.rows.length === 0) {
    throw new Error('List not found');
  }
}

/**
 * Get resolved items for a list
 */
export async function getListItems(
  userId: number,
  listId: number
): Promise<ResolvedItem[]> {
  const list = await getListById(userId, listId);
  if (!list) {
    throw new Error('List not found');
  }

  return resolveList(userId, list);
}

/**
 * Add a manual pin to a list
 */
export async function addListPin(
  userId: number,
  listId: number,
  mediaId: number,
  pinType: 'include' | 'exclude'
): Promise<void> {
  await ensureDb();

  // Verify list exists and belongs to user
  const list = await getListById(userId, listId);
  if (!list) {
    throw new Error('List not found');
  }

  // Get next position for includes
  let position = 0;
  if (pinType === 'include') {
    const posResult = await sql`
      SELECT COALESCE(MAX(position), -1) + 1 as next_pos
      FROM saved_list_pins
      WHERE saved_list_id = ${listId} AND pin_type = 'include'
    `;
    position = posResult.rows[0].next_pos;
  }

  await sql`
    INSERT INTO saved_list_pins (saved_list_id, media_id, pin_type, position)
    VALUES (${listId}, ${mediaId}, ${pinType}, ${position})
    ON CONFLICT (saved_list_id, media_id)
    DO UPDATE SET pin_type = EXCLUDED.pin_type, position = EXCLUDED.position
  `;
}

/**
 * Remove a pin from a list
 */
export async function removeListPin(
  userId: number,
  listId: number,
  mediaId: number
): Promise<void> {
  await ensureDb();

  // Verify list exists and belongs to user
  const list = await getListById(userId, listId);
  if (!list) {
    throw new Error('List not found');
  }

  await sql`
    DELETE FROM saved_list_pins
    WHERE saved_list_id = ${listId} AND media_id = ${mediaId}
  `;
}

/**
 * Reorder lists
 */
export async function reorderLists(
  userId: number,
  listIds: number[]
): Promise<void> {
  await ensureDb();

  for (let i = 0; i < listIds.length; i++) {
    await sql`
      UPDATE saved_lists
      SET position = ${i}
      WHERE id = ${listIds[i]} AND user_id = ${userId}
    `;
  }
}

// Helper to map database row to List
function mapRowToList(row: Record<string, unknown>): List {
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string | null,
    icon: row.icon as string,
    color: row.color as string,
    listType: row.list_type as 'smart' | 'manual' | 'hybrid',
    filterRules: (row.filter_rules || {}) as FilterRules,
    sortBy: row.sort_by as string,
    sortDirection: row.sort_direction as 'asc' | 'desc',
    itemLimit: row.item_limit as number,
    isPublic: row.is_public as boolean,
    position: row.position as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    itemCount: row.pin_count !== undefined ? parseInt(row.pin_count as string, 10) : undefined,
  };
}
