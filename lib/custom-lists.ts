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

// Get all custom lists for a user (including lists they're collaborating on)
export async function getCustomLists(userId: number, includeShared: boolean = true): Promise<CustomList[]> {
  await ensureDb();

  // Get user's own lists
  const ownedResult = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.user_id = ${userId}
    GROUP BY cl.id
    ORDER BY cl.position ASC, cl.created_at DESC
  `;

  if (!includeShared) {
    return ownedResult.rows as CustomList[];
  }

  // Get lists shared with the user
  const sharedResult = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    JOIN custom_list_collaborators clc ON cl.id = clc.custom_list_id
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE clc.user_id = ${userId}
      AND clc.status = 'accepted'
      AND clc.role = 'collaborator'
    GROUP BY cl.id
    ORDER BY cl.position ASC, cl.created_at DESC
  `;

  // Combine owned and shared lists
  return [...ownedResult.rows, ...sharedResult.rows] as CustomList[];
}

// Get a single custom list by slug (checks ownership or collaborator access)
export async function getCustomList(userId: number, slug: string): Promise<CustomList | null> {
  await ensureDb();

  // Try to get as owner first
  const ownedResult = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.user_id = ${userId} AND cl.slug = ${slug}
    GROUP BY cl.id
  `;

  if (ownedResult.rows[0]) {
    return ownedResult.rows[0] as CustomList;
  }

  // Try to get as collaborator
  const sharedResult = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    JOIN custom_list_collaborators clc ON cl.id = clc.custom_list_id
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.slug = ${slug}
      AND clc.user_id = ${userId}
      AND clc.status = 'accepted'
    GROUP BY cl.id
  `;

  return sharedResult.rows[0] as CustomList || null;
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

// Get items in a custom list (checks ownership or collaborator access)
export async function getCustomListItems(userId: number, slug: string): Promise<CustomListItem[]> {
  await ensureDb();

  // First verify the user has access to this list
  const list = await getCustomList(userId, slug);
  if (!list) {
    return [];
  }

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
    WHERE cl.id = ${list.id}
    ORDER BY cli.position ASC, cli.added_at DESC
  `;

  return result.rows as CustomListItem[];
}

// Add item to custom list (works for owners and collaborators)
export async function addItemToList(
  userId: number,
  slug: string,
  mediaId: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Verify list access (ownership or collaborator)
  const list = await getCustomList(userId, slug);
  if (!list) {
    return { success: false, error: 'List not found or access denied' };
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

// Remove item from custom list (works for owners and collaborators)
export async function removeItemFromList(
  userId: number,
  slug: string,
  mediaId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Verify list access (ownership or collaborator)
  const list = await getCustomList(userId, slug);
  if (!list) {
    return { success: false, error: 'List not found or access denied' };
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

// Check if media is in any custom lists for a user (includes shared lists)
export async function getMediaCustomLists(userId: number, mediaId: number): Promise<{ listId: number; slug: string; name: string }[]> {
  await ensureDb();

  // Get from owned lists
  const ownedResult = await sql`
    SELECT cl.id as list_id, cl.slug, cl.name
    FROM custom_lists cl
    JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE cl.user_id = ${userId} AND cli.media_id = ${mediaId}
  `;

  // Get from shared lists
  const sharedResult = await sql`
    SELECT cl.id as list_id, cl.slug, cl.name
    FROM custom_lists cl
    JOIN custom_list_collaborators clc ON cl.id = clc.custom_list_id
    JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE clc.user_id = ${userId}
      AND clc.status = 'accepted'
      AND cli.media_id = ${mediaId}
  `;

  const combined = [...ownedResult.rows, ...sharedResult.rows];
  // Remove duplicates
  const seen = new Set<number>();
  return combined.filter(row => {
    if (seen.has(row.list_id)) return false;
    seen.add(row.list_id);
    return true;
  }).map(row => ({
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

// ============================================
// COLLABORATOR MANAGEMENT
// ============================================

export interface CustomListCollaborator {
  id: number;
  custom_list_id: number;
  user_id: number;
  role: 'owner' | 'collaborator';
  invite_code: string | null;
  invite_expires_at: Date | null;
  status: 'pending' | 'accepted';
  added_at: Date;
  // Joined fields
  user_name?: string;
  user_email?: string;
}

// Generate a random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create an invite link for a custom list
export async function createListInvite(
  userId: number,
  slug: string
): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
  await ensureDb();

  // Verify ownership
  const list = await getCustomList(userId, slug);
  if (!list) {
    return { success: false, error: 'List not found' };
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  try {
    // Create a pending collaborator entry with the invite code
    await sql`
      INSERT INTO custom_list_collaborators (custom_list_id, user_id, role, invite_code, invite_expires_at, status)
      VALUES (${list.id}, ${userId}, 'owner', ${inviteCode}, ${expiresAt.toISOString()}, 'pending')
      ON CONFLICT (custom_list_id, user_id)
      DO UPDATE SET invite_code = ${inviteCode}, invite_expires_at = ${expiresAt.toISOString()}
    `;

    return { success: true, inviteCode };
  } catch (error) {
    console.error('Error creating list invite:', error);
    return { success: false, error: 'Failed to create invite' };
  }
}

// Get invite details by code
export async function getListInvite(inviteCode: string): Promise<{
  list: CustomList;
  owner: { id: number; name: string; email: string };
  expiresAt: Date;
} | null> {
  await ensureDb();

  const result = await sql`
    SELECT
      cl.*,
      clc.invite_expires_at,
      u.id as owner_id,
      u.name as owner_name,
      u.email as owner_email
    FROM custom_list_collaborators clc
    JOIN custom_lists cl ON clc.custom_list_id = cl.id
    JOIN users u ON cl.user_id = u.id
    WHERE clc.invite_code = ${inviteCode}
      AND clc.status = 'pending'
      AND clc.invite_expires_at > CURRENT_TIMESTAMP
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    list: {
      id: row.id,
      user_id: row.user_id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      is_shared: row.is_shared,
      position: row.position,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      email: row.owner_email,
    },
    expiresAt: row.invite_expires_at,
  };
}

// Accept an invite to join a custom list
export async function acceptListInvite(
  userId: number,
  inviteCode: string
): Promise<{ success: boolean; list?: CustomList; error?: string }> {
  await ensureDb();

  // Get the invite details
  const invite = await getListInvite(inviteCode);
  if (!invite) {
    return { success: false, error: 'Invalid or expired invite' };
  }

  // Can't accept your own invite
  if (invite.owner.id === userId) {
    return { success: false, error: 'You cannot accept your own invite' };
  }

  try {
    // Add the user as a collaborator
    await sql`
      INSERT INTO custom_list_collaborators (custom_list_id, user_id, role, status, added_at)
      VALUES (${invite.list.id}, ${userId}, 'collaborator', 'accepted', CURRENT_TIMESTAMP)
      ON CONFLICT (custom_list_id, user_id)
      DO UPDATE SET status = 'accepted', added_at = CURRENT_TIMESTAMP
    `;

    // Mark the list as shared
    await sql`
      UPDATE custom_lists SET is_shared = true WHERE id = ${invite.list.id}
    `;

    return { success: true, list: invite.list };
  } catch (error) {
    console.error('Error accepting list invite:', error);
    return { success: false, error: 'Failed to accept invite' };
  }
}

// Get all collaborators for a custom list
export async function getListCollaborators(
  userId: number,
  slug: string
): Promise<CustomListCollaborator[]> {
  await ensureDb();

  // Verify access (owner or collaborator)
  const list = await getCustomList(userId, slug);
  if (!list) {
    // Check if user is a collaborator
    const collabResult = await sql`
      SELECT cl.* FROM custom_lists cl
      JOIN custom_list_collaborators clc ON cl.id = clc.custom_list_id
      WHERE cl.slug = ${slug} AND clc.user_id = ${userId} AND clc.status = 'accepted'
    `;
    if (collabResult.rows.length === 0) {
      return [];
    }
  }

  const result = await sql`
    SELECT
      clc.*,
      u.name as user_name,
      u.email as user_email
    FROM custom_list_collaborators clc
    JOIN custom_lists cl ON clc.custom_list_id = cl.id
    JOIN users u ON clc.user_id = u.id
    WHERE cl.slug = ${slug} AND clc.status = 'accepted'
    ORDER BY clc.role = 'owner' DESC, clc.added_at ASC
  `;

  return result.rows as CustomListCollaborator[];
}

// Add a collaborator directly (for existing connections)
export async function addCollaboratorDirect(
  ownerId: number,
  slug: string,
  collaboratorId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Verify ownership
  const list = await getCustomList(ownerId, slug);
  if (!list) {
    return { success: false, error: 'List not found' };
  }

  // Can't add yourself
  if (ownerId === collaboratorId) {
    return { success: false, error: 'Cannot add yourself as a collaborator' };
  }

  try {
    await sql`
      INSERT INTO custom_list_collaborators (custom_list_id, user_id, role, status, added_at)
      VALUES (${list.id}, ${collaboratorId}, 'collaborator', 'accepted', CURRENT_TIMESTAMP)
      ON CONFLICT (custom_list_id, user_id) DO NOTHING
    `;

    // Mark the list as shared
    await sql`
      UPDATE custom_lists SET is_shared = true WHERE id = ${list.id}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return { success: false, error: 'Failed to add collaborator' };
  }
}

// Remove a collaborator from a custom list
export async function removeCollaborator(
  userId: number,
  slug: string,
  collaboratorId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Verify ownership
  const list = await getCustomList(userId, slug);
  if (!list) {
    return { success: false, error: 'List not found' };
  }

  try {
    await sql`
      DELETE FROM custom_list_collaborators
      WHERE custom_list_id = ${list.id} AND user_id = ${collaboratorId} AND role != 'owner'
    `;

    // Check if any collaborators remain
    const remaining = await sql`
      SELECT COUNT(*)::int as count FROM custom_list_collaborators
      WHERE custom_list_id = ${list.id} AND status = 'accepted' AND role = 'collaborator'
    `;

    // If no collaborators, mark as not shared
    if (remaining.rows[0].count === 0) {
      await sql`
        UPDATE custom_lists SET is_shared = false WHERE id = ${list.id}
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return { success: false, error: 'Failed to remove collaborator' };
  }
}

// Leave a shared list (as a collaborator)
export async function leaveSharedList(
  userId: number,
  listId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    const result = await sql`
      DELETE FROM custom_list_collaborators
      WHERE custom_list_id = ${listId} AND user_id = ${userId} AND role = 'collaborator'
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return { success: false, error: 'Not a collaborator on this list' };
    }

    // Check if any collaborators remain
    const remaining = await sql`
      SELECT COUNT(*)::int as count FROM custom_list_collaborators
      WHERE custom_list_id = ${listId} AND status = 'accepted' AND role = 'collaborator'
    `;

    // If no collaborators, mark as not shared
    if (remaining.rows[0].count === 0) {
      await sql`
        UPDATE custom_lists SET is_shared = false WHERE id = ${listId}
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Error leaving shared list:', error);
    return { success: false, error: 'Failed to leave list' };
  }
}

// Get lists shared with a user (lists they're collaborating on)
export async function getSharedLists(userId: number): Promise<CustomList[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      cl.*,
      COUNT(cli.id)::int as item_count
    FROM custom_lists cl
    JOIN custom_list_collaborators clc ON cl.id = clc.custom_list_id
    LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
    WHERE clc.user_id = ${userId}
      AND clc.status = 'accepted'
      AND clc.role = 'collaborator'
    GROUP BY cl.id
    ORDER BY cl.position ASC, cl.created_at DESC
  `;

  return result.rows as CustomList[];
}

// Get existing connections (users you've collaborated with before)
export async function getExistingConnections(userId: number): Promise<{ id: number; name: string; email: string }[]> {
  await ensureDb();

  // Get users from both system list collaborations and custom list collaborations
  const result = await sql`
    SELECT DISTINCT u.id, u.name, u.email
    FROM users u
    WHERE u.id IN (
      -- From system list collaborators table
      SELECT CASE WHEN c.owner_id = ${userId} THEN c.collaborator_id ELSE c.owner_id END
      FROM collaborators c
      WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
        AND c.status = 'accepted'
      UNION
      -- From custom list collaborators (where user is owner)
      SELECT clc.user_id
      FROM custom_list_collaborators clc
      JOIN custom_lists cl ON clc.custom_list_id = cl.id
      WHERE cl.user_id = ${userId} AND clc.status = 'accepted' AND clc.role = 'collaborator'
      UNION
      -- From custom list collaborators (where user is collaborator)
      SELECT cl.user_id
      FROM custom_list_collaborators clc
      JOIN custom_lists cl ON clc.custom_list_id = cl.id
      WHERE clc.user_id = ${userId} AND clc.status = 'accepted' AND clc.role = 'collaborator'
    )
    AND u.id != ${userId}
    ORDER BY u.name ASC
  `;

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
  }));
}

// Get custom lists with items filtered by media type (for /movies/all and /shows/all pages)
// Includes both owned lists and shared lists
export async function getCustomListsWithMediaType(
  userId: number,
  mediaType: 'movie' | 'tv'
): Promise<(CustomList & { items: CustomListItem[] })[]> {
  await ensureDb();

  // Get owned custom lists for the user
  const ownedListsResult = await sql`
    SELECT * FROM custom_lists
    WHERE user_id = ${userId}
    ORDER BY position ASC, created_at DESC
  `;

  // Get shared custom lists
  const sharedListsResult = await sql`
    SELECT cl.* FROM custom_lists cl
    JOIN custom_list_collaborators clc ON cl.id = clc.custom_list_id
    WHERE clc.user_id = ${userId}
      AND clc.status = 'accepted'
      AND clc.role = 'collaborator'
    ORDER BY cl.position ASC, cl.created_at DESC
  `;

  const allLists = [...ownedListsResult.rows, ...sharedListsResult.rows] as CustomList[];

  // For each list, get items of the specified media type
  const listsWithItems: (CustomList & { items: CustomListItem[] })[] = [];

  for (const list of allLists) {
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

    // Include all lists, even if empty for this media type
    listsWithItems.push({
      ...list,
      item_count: items.length,
      items,
    });
  }

  return listsWithItems;
}
