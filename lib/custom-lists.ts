import { db as sql, initDb } from './db';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

// Limits
export const MAX_CUSTOM_LISTS = 10;
export const MAX_LIST_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_ITEMS_PER_LIST = 500;

// Available icons for custom lists
export const AVAILABLE_ICONS = [
  'list', 'folder', 'bookmark', 'star', 'heart',
  'smile', 'laugh', 'frown', 'ghost', 'flame',
  'snowflake', 'sun', 'moon', 'popcorn', 'sofa',
  'users', 'baby', 'gamepad', 'calendar', 'clock',
  'hourglass', 'trophy', 'target', 'gift', 'music',
] as const;

export type IconType = typeof AVAILABLE_ICONS[number];

// Available colors for custom lists
export const AVAILABLE_COLORS = [
  { name: 'gray', value: '#6b7280' },
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'yellow', value: '#eab308' },
  { name: 'lime', value: '#84cc16' },
  { name: 'green', value: '#22c55e' },
  { name: 'emerald', value: '#10b981' },
  { name: 'teal', value: '#14b8a6' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'sky', value: '#0ea5e9' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'indigo', value: '#6366f1' },
  { name: 'violet', value: '#8b5cf6' },
  { name: 'purple', value: '#a855f7' },
  { name: 'fuchsia', value: '#d946ef' },
  { name: 'pink', value: '#ec4899' },
  { name: 'rose', value: '#f43f5e' },
] as const;

export type ColorName = typeof AVAILABLE_COLORS[number]['name'];

export interface CustomList {
  id: number;
  user_id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_shared: boolean;
  position: number;
  created_at: Date;
  updated_at: Date;
  item_count?: number;
}

export interface CustomListItem {
  id: number;
  custom_list_id: number;
  media_id: number;
  added_by: number | null;
  notes: string | null;
  position: number;
  added_at: Date;
  // Joined fields
  title?: string;
  poster_path?: string;
  media_type?: string;
  tmdb_id?: number;
  added_by_name?: string;
}

// Generate URL-safe slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Get unique slug for a user
async function getUniqueSlug(userId: number, baseName: string): Promise<string> {
  const baseSlug = generateSlug(baseName);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await sql`
      SELECT id FROM custom_lists
      WHERE user_id = ${userId} AND slug = ${slug}
    `;

    if (existing.rows.length === 0) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// Get all custom lists for a user
export async function getCustomLists(userId: number): Promise<CustomList[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.user_id = ${userId}
    GROUP BY cl.id
    ORDER BY cl.position ASC, cl.created_at DESC
  `;

  return result.rows as CustomList[];
}

// Get a single custom list by slug
export async function getCustomList(userId: number, slug: string): Promise<CustomList | null> {
  await ensureDb();

  const result = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.user_id = ${userId} AND cl.slug = ${slug}
    GROUP BY cl.id
  `;

  return result.rows[0] as CustomList || null;
}

// Get custom list by ID (for internal use)
export async function getCustomListById(listId: number): Promise<CustomList | null> {
  await ensureDb();

  const result = await sql`
    SELECT * FROM custom_lists WHERE id = ${listId}
  `;

  return result.rows[0] as CustomList || null;
}

// Create a new custom list
export async function createCustomList(
  userId: number,
  name: string,
  options: {
    description?: string;
    icon?: string;
    color?: string;
    is_shared?: boolean;
  } = {}
): Promise<{ success: boolean; list?: CustomList; error?: string }> {
  await ensureDb();

  // Validate name
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'List name is required' };
  }
  if (trimmedName.length > MAX_LIST_NAME_LENGTH) {
    return { success: false, error: `List name must be ${MAX_LIST_NAME_LENGTH} characters or less` };
  }

  // Validate description
  if (options.description && options.description.length > MAX_DESCRIPTION_LENGTH) {
    return { success: false, error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` };
  }

  // Validate icon
  const icon = options.icon || 'list';
  if (!AVAILABLE_ICONS.includes(icon as IconType)) {
    return { success: false, error: 'Invalid icon' };
  }

  // Validate color
  const color = options.color || 'gray';
  if (!AVAILABLE_COLORS.some(c => c.name === color)) {
    return { success: false, error: 'Invalid color' };
  }

  // Check limit
  const countResult = await sql`
    SELECT COUNT(*)::int as count FROM custom_lists WHERE user_id = ${userId}
  `;
  if (countResult.rows[0].count >= MAX_CUSTOM_LISTS) {
    return { success: false, error: `You can only have ${MAX_CUSTOM_LISTS} custom lists` };
  }

  // Generate unique slug
  const slug = await getUniqueSlug(userId, trimmedName);

  try {
    const result = await sql`
      INSERT INTO custom_lists (user_id, slug, name, description, icon, color, is_shared)
      VALUES (
        ${userId},
        ${slug},
        ${trimmedName},
        ${options.description || null},
        ${icon},
        ${color},
        ${options.is_shared || false}
      )
      RETURNING *
    `;

    return { success: true, list: result.rows[0] as CustomList };
  } catch (error) {
    console.error('Error creating custom list:', error);
    return { success: false, error: 'Failed to create list' };
  }
}

// Update a custom list
export async function updateCustomList(
  userId: number,
  slug: string,
  updates: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    is_shared?: boolean;
  }
): Promise<{ success: boolean; list?: CustomList; error?: string }> {
  await ensureDb();

  // Verify ownership
  const existing = await getCustomList(userId, slug);
  if (!existing) {
    return { success: false, error: 'List not found' };
  }

  // Validate updates
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'List name is required' };
    }
    if (trimmedName.length > MAX_LIST_NAME_LENGTH) {
      return { success: false, error: `List name must be ${MAX_LIST_NAME_LENGTH} characters or less` };
    }
    updates.name = trimmedName;
  }

  if (updates.description !== undefined && updates.description !== null) {
    if (updates.description.length > MAX_DESCRIPTION_LENGTH) {
      return { success: false, error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` };
    }
  }

  if (updates.icon !== undefined && !AVAILABLE_ICONS.includes(updates.icon as IconType)) {
    return { success: false, error: 'Invalid icon' };
  }

  if (updates.color !== undefined && !AVAILABLE_COLORS.some(c => c.name === updates.color)) {
    return { success: false, error: 'Invalid color' };
  }

  try {
    const result = await sql`
      UPDATE custom_lists
      SET
        name = COALESCE(${updates.name}, name),
        description = CASE WHEN ${updates.description !== undefined} THEN ${updates.description} ELSE description END,
        icon = COALESCE(${updates.icon}, icon),
        color = COALESCE(${updates.color}, color),
        is_shared = COALESCE(${updates.is_shared}, is_shared),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND slug = ${slug}
      RETURNING *
    `;

    return { success: true, list: result.rows[0] as CustomList };
  } catch (error) {
    console.error('Error updating custom list:', error);
    return { success: false, error: 'Failed to update list' };
  }
}

// Delete a custom list
export async function deleteCustomList(userId: number, slug: string): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    const result = await sql`
      DELETE FROM custom_lists
      WHERE user_id = ${userId} AND slug = ${slug}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return { success: false, error: 'List not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting custom list:', error);
    return { success: false, error: 'Failed to delete list' };
  }
}

// Get items in a custom list
export async function getCustomListItems(userId: number, slug: string): Promise<CustomListItem[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      cli.*,
      m.title,
      m.poster_path,
      m.media_type,
      m.tmdb_id,
      u.name as added_by_name
    FROM custom_list_items cli
    JOIN custom_lists cl ON cli.custom_list_id = cl.id
    JOIN media m ON cli.media_id = m.id
    LEFT JOIN users u ON cli.added_by = u.id
    WHERE cl.user_id = ${userId} AND cl.slug = ${slug}
    ORDER BY cli.position ASC, cli.added_at DESC
  `;

  return result.rows as CustomListItem[];
}

// Add item to custom list
export async function addItemToList(
  userId: number,
  slug: string,
  mediaId: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Verify list ownership
  const list = await getCustomList(userId, slug);
  if (!list) {
    return { success: false, error: 'List not found' };
  }

  // Check item limit
  if (list.item_count && list.item_count >= MAX_ITEMS_PER_LIST) {
    return { success: false, error: `Lists can only have ${MAX_ITEMS_PER_LIST} items` };
  }

  try {
    await sql`
      INSERT INTO custom_list_items (custom_list_id, media_id, added_by, notes)
      VALUES (${list.id}, ${mediaId}, ${userId}, ${notes || null})
      ON CONFLICT (custom_list_id, media_id) DO NOTHING
    `;

    return { success: true };
  } catch (error) {
    console.error('Error adding item to list:', error);
    return { success: false, error: 'Failed to add item' };
  }
}

// Remove item from custom list
export async function removeItemFromList(
  userId: number,
  slug: string,
  mediaId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Verify list ownership
  const list = await getCustomList(userId, slug);
  if (!list) {
    return { success: false, error: 'List not found' };
  }

  try {
    await sql`
      DELETE FROM custom_list_items
      WHERE custom_list_id = ${list.id} AND media_id = ${mediaId}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error removing item from list:', error);
    return { success: false, error: 'Failed to remove item' };
  }
}

// Check if media is in any custom lists for a user
export async function getMediaCustomLists(userId: number, mediaId: number): Promise<{ listId: number; slug: string; name: string }[]> {
  await ensureDb();

  const result = await sql`
    SELECT cl.id as list_id, cl.slug, cl.name
    FROM custom_lists cl
    JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.user_id = ${userId} AND cli.media_id = ${mediaId}
  `;

  return result.rows.map(row => ({
    listId: row.list_id,
    slug: row.slug,
    name: row.name,
  }));
}

// Get custom lists count for a user
export async function getCustomListsCount(userId: number): Promise<number> {
  await ensureDb();

  const result = await sql`
    SELECT COUNT(*)::int as count FROM custom_lists WHERE user_id = ${userId}
  `;

  return result.rows[0].count;
}

// Get custom lists with items filtered by media type (for /movies/all and /shows/all pages)
export async function getCustomListsWithMediaType(
  userId: number,
  mediaType: 'movie' | 'tv'
): Promise<(CustomList & { items: CustomListItem[] })[]> {
  await ensureDb();

  // Get all custom lists for the user
  const listsResult = await sql`
    SELECT * FROM custom_lists
    WHERE user_id = ${userId}
    ORDER BY position ASC, created_at DESC
  `;

  const lists = listsResult.rows as CustomList[];

  // For each list, get items of the specified media type
  const listsWithItems: (CustomList & { items: CustomListItem[] })[] = [];

  for (const list of lists) {
    const itemsResult = await sql`
      SELECT
        cli.*,
        m.title,
        m.poster_path,
        m.media_type,
        m.tmdb_id
      FROM custom_list_items cli
      JOIN media m ON cli.media_id = m.id
      WHERE cli.custom_list_id = ${list.id}
        AND m.media_type = ${mediaType}
      ORDER BY cli.position ASC, cli.added_at DESC
    `;

    const items = itemsResult.rows as CustomListItem[];

    // Only show lists that have at least 1 item of the specified media type
    if (items.length > 0) {
      listsWithItems.push({
        ...list,
        item_count: items.length,
        items,
      });
    }
  }

  return listsWithItems;
}
