import { db } from './db';
import { areFriends, getFriends } from './friends';

// Visibility levels in order of openness
export type VisibilityLevel = 'private' | 'select_friends' | 'friends' | 'public';

// System list types
export const SYSTEM_LIST_TYPES = [
  'watchlist',
  'watching',
  'finished',
  'onhold',
  'dropped',
  'favorites',
  'rewatch',
  'nostalgia'
] as const;

export type SystemListType = typeof SYSTEM_LIST_TYPES[number];

export interface ListVisibility {
  listType: string;
  listId: number | null;
  visibility: VisibilityLevel;
  updatedAt: Date;
}

export interface FriendListAccess {
  id: number;
  friendId: number;
  friendName: string;
  friendUsername: string | null;
  friendImage: string | null;
  listType: string;
  listId: number | null;
  canEdit: boolean;
  grantedAt: Date;
}

export interface ListWithAccess {
  listType: string;
  listId: number | null;
  listName: string;
  visibility: VisibilityLevel;
  friendCount: number;
  itemCount?: number;
}

// ============================================================================
// Visibility Settings
// ============================================================================

/**
 * Get visibility setting for a specific list
 */
export async function getListVisibility(
  userId: number,
  listType: string,
  listId: number | null = null
): Promise<VisibilityLevel> {
  const result = await db`
    SELECT visibility
    FROM list_visibility
    WHERE user_id = ${userId}
      AND list_type = ${listType}
      AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
  `;

  return (result.rows[0]?.visibility as VisibilityLevel) || 'private';
}

/**
 * Get visibility settings for all of a user's lists
 */
export async function getAllListVisibility(userId: number): Promise<ListVisibility[]> {
  const result = await db`
    SELECT list_type, list_id, visibility, updated_at
    FROM list_visibility
    WHERE user_id = ${userId}
    ORDER BY list_type, list_id
  `;

  return result.rows.map(row => ({
    listType: row.list_type,
    listId: row.list_id,
    visibility: row.visibility as VisibilityLevel,
    updatedAt: row.updated_at
  }));
}

/**
 * Set visibility for a specific list
 */
export async function setListVisibility(
  userId: number,
  listType: string,
  visibility: VisibilityLevel,
  listId: number | null = null
): Promise<void> {
  // Check if record exists
  const existing = await db`
    SELECT id FROM list_visibility
    WHERE user_id = ${userId}
      AND list_type = ${listType}
      AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
  `;

  if (existing.rows.length > 0) {
    // Update existing
    await db`
      UPDATE list_visibility
      SET visibility = ${visibility}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${existing.rows[0].id}
    `;
  } else {
    // Insert new
    await db`
      INSERT INTO list_visibility (user_id, list_type, list_id, visibility, updated_at)
      VALUES (${userId}, ${listType}, ${listId}, ${visibility}, CURRENT_TIMESTAMP)
    `;
  }

  // If changing from 'select_friends' to another visibility, we keep the friend access
  // records (they become effective again if user switches back to 'select_friends')
}

/**
 * Set visibility for multiple lists at once (batch update)
 */
export async function setMultipleListVisibility(
  userId: number,
  lists: Array<{ listType: string; listId?: number | null; visibility: VisibilityLevel }>
): Promise<void> {
  for (const list of lists) {
    await setListVisibility(userId, list.listType, list.visibility, list.listId ?? null);
  }
}

// ============================================================================
// Friend Access Management
// ============================================================================

/**
 * Grant a friend access to a specific list
 */
export async function grantFriendAccess(
  ownerId: number,
  friendId: number,
  listType: string,
  listId: number | null = null,
  canEdit: boolean = false
): Promise<void> {
  // Verify they are actually friends
  const friends = await areFriends(ownerId, friendId);
  if (!friends) {
    throw new Error('Users are not friends');
  }

  // Check if record exists
  const existing = await db`
    SELECT id FROM friend_list_access
    WHERE owner_id = ${ownerId}
      AND friend_id = ${friendId}
      AND list_type = ${listType}
      AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
  `;

  if (existing.rows.length > 0) {
    // Update existing
    await db`
      UPDATE friend_list_access
      SET can_edit = ${canEdit}, granted_at = CURRENT_TIMESTAMP
      WHERE id = ${existing.rows[0].id}
    `;
  } else {
    // Insert new
    await db`
      INSERT INTO friend_list_access (owner_id, friend_id, list_type, list_id, can_edit, granted_at)
      VALUES (${ownerId}, ${friendId}, ${listType}, ${listId}, ${canEdit}, CURRENT_TIMESTAMP)
    `;
  }
}

/**
 * Revoke a friend's access to a specific list
 */
export async function revokeFriendAccess(
  ownerId: number,
  friendId: number,
  listType: string,
  listId: number | null = null
): Promise<void> {
  await db`
    DELETE FROM friend_list_access
    WHERE owner_id = ${ownerId}
      AND friend_id = ${friendId}
      AND list_type = ${listType}
      AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
  `;
}

/**
 * Grant a friend access to multiple lists at once
 */
export async function grantFriendAccessMultiple(
  ownerId: number,
  friendId: number,
  lists: Array<{ listType: string; listId?: number | null; canEdit?: boolean }>
): Promise<void> {
  // Verify friendship once
  const friends = await areFriends(ownerId, friendId);
  if (!friends) {
    throw new Error('Users are not friends');
  }

  for (const list of lists) {
    const listId = list.listId ?? null;
    const canEdit = list.canEdit ?? false;

    // Check if record exists
    const existing = await db`
      SELECT id FROM friend_list_access
      WHERE owner_id = ${ownerId}
        AND friend_id = ${friendId}
        AND list_type = ${list.listType}
        AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
    `;

    if (existing.rows.length > 0) {
      await db`
        UPDATE friend_list_access
        SET can_edit = ${canEdit}, granted_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.rows[0].id}
      `;
    } else {
      await db`
        INSERT INTO friend_list_access (owner_id, friend_id, list_type, list_id, can_edit, granted_at)
        VALUES (${ownerId}, ${friendId}, ${list.listType}, ${listId}, ${canEdit}, CURRENT_TIMESTAMP)
      `;
    }
  }
}

/**
 * Revoke all of a friend's access (when unfriending)
 */
export async function revokeAllFriendAccess(ownerId: number, friendId: number): Promise<void> {
  await db`
    DELETE FROM friend_list_access
    WHERE owner_id = ${ownerId} AND friend_id = ${friendId}
  `;
}

/**
 * Get all friends who have access to a specific list
 */
export async function getListFriends(
  ownerId: number,
  listType: string,
  listId: number | null = null
): Promise<FriendListAccess[]> {
  const result = await db`
    SELECT
      fla.id,
      fla.friend_id,
      u.name as friend_name,
      u.username as friend_username,
      u.profile_image as friend_image,
      fla.list_type,
      fla.list_id,
      fla.can_edit,
      fla.granted_at
    FROM friend_list_access fla
    JOIN users u ON u.id = fla.friend_id
    WHERE fla.owner_id = ${ownerId}
      AND fla.list_type = ${listType}
      AND (fla.list_id = ${listId} OR (fla.list_id IS NULL AND ${listId} IS NULL))
    ORDER BY fla.granted_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    friendId: row.friend_id,
    friendName: row.friend_name,
    friendUsername: row.friend_username,
    friendImage: row.friend_image,
    listType: row.list_type,
    listId: row.list_id,
    canEdit: row.can_edit,
    grantedAt: row.granted_at
  }));
}

/**
 * Get all lists a user has granted access to any friend
 */
export async function getSharedListsSummary(userId: number): Promise<ListWithAccess[]> {
  const result = await db`
    SELECT
      lv.list_type,
      lv.list_id,
      lv.visibility,
      COUNT(DISTINCT fla.friend_id) as friend_count
    FROM list_visibility lv
    LEFT JOIN friend_list_access fla ON
      fla.owner_id = lv.user_id
      AND fla.list_type = lv.list_type
      AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
    WHERE lv.user_id = ${userId}
      AND lv.visibility != 'private'
    GROUP BY lv.list_type, lv.list_id, lv.visibility
    ORDER BY lv.list_type, lv.list_id
  `;

  return result.rows.map(row => ({
    listType: row.list_type,
    listId: row.list_id,
    listName: row.list_type, // Will be resolved to display name by caller
    visibility: row.visibility as VisibilityLevel,
    friendCount: parseInt(row.friend_count, 10)
  }));
}

// ============================================================================
// Access Checking
// ============================================================================

/**
 * Check if a user can view another user's list
 */
export async function canViewList(
  viewerId: number,
  ownerId: number,
  listType: string,
  listId: number | null = null
): Promise<boolean> {
  // Owner can always view their own lists
  if (viewerId === ownerId) {
    return true;
  }

  // Get visibility setting
  const visibility = await getListVisibility(ownerId, listType, listId);

  switch (visibility) {
    case 'private':
      return false;

    case 'public':
      return true;

    case 'friends':
      // Check if they are friends
      return await areFriends(viewerId, ownerId);

    case 'select_friends':
      // Check if viewer has explicit access
      const accessResult = await db`
        SELECT id FROM friend_list_access
        WHERE owner_id = ${ownerId}
          AND friend_id = ${viewerId}
          AND list_type = ${listType}
          AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
      `;
      return accessResult.rows.length > 0;

    default:
      return false;
  }
}

/**
 * Check if a user can edit another user's list (collaborator access)
 */
export async function canEditList(
  editorId: number,
  ownerId: number,
  listType: string,
  listId: number | null = null
): Promise<boolean> {
  // Owner can always edit their own lists
  if (editorId === ownerId) {
    return true;
  }

  // Check for explicit edit access
  const result = await db`
    SELECT can_edit FROM friend_list_access
    WHERE owner_id = ${ownerId}
      AND friend_id = ${editorId}
      AND list_type = ${listType}
      AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
      AND can_edit = true
  `;

  return result.rows.length > 0;
}

/**
 * Get all lists a friend has shared with the viewer
 */
export async function getListsSharedWithMe(viewerId: number, ownerId: number): Promise<ListWithAccess[]> {
  // First check if they're friends
  const friends = await areFriends(viewerId, ownerId);
  if (!friends) {
    return [];
  }

  // Get all lists where viewer has access
  const result = await db`
    SELECT DISTINCT
      lv.list_type,
      lv.list_id,
      lv.visibility,
      COALESCE(fla.can_edit, false) as can_edit
    FROM list_visibility lv
    LEFT JOIN friend_list_access fla ON
      fla.owner_id = lv.user_id
      AND fla.friend_id = ${viewerId}
      AND fla.list_type = lv.list_type
      AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
    WHERE lv.user_id = ${ownerId}
      AND (
        lv.visibility = 'friends'
        OR lv.visibility = 'public'
        OR (lv.visibility = 'select_friends' AND fla.id IS NOT NULL)
      )
    ORDER BY lv.list_type, lv.list_id
  `;

  return result.rows.map(row => ({
    listType: row.list_type,
    listId: row.list_id,
    listName: row.list_type,
    visibility: row.visibility as VisibilityLevel,
    friendCount: 0 // Not relevant for this query
  }));
}

/**
 * Get all friends who have shared at least one list with the user
 */
export async function getFriendsWhoShareLists(userId: number): Promise<Array<{
  friendId: number;
  friendName: string;
  friendUsername: string | null;
  friendImage: string | null;
  sharedListCount: number;
}>> {
  const result = await db`
    WITH friend_ids AS (
      SELECT
        CASE
          WHEN c.owner_id = ${userId} THEN c.collaborator_id
          ELSE c.owner_id
        END as friend_id
      FROM collaborators c
      WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
        AND c.status = 'accepted'
        AND c.type = 'friend'
    )
    SELECT
      u.id as friend_id,
      u.name as friend_name,
      u.username as friend_username,
      u.profile_image as friend_image,
      COUNT(DISTINCT CONCAT(lv.list_type, '-', COALESCE(lv.list_id::text, 'null'))) as shared_list_count
    FROM friend_ids fi
    JOIN users u ON u.id = fi.friend_id
    JOIN list_visibility lv ON lv.user_id = fi.friend_id
    LEFT JOIN friend_list_access fla ON
      fla.owner_id = fi.friend_id
      AND fla.friend_id = ${userId}
      AND fla.list_type = lv.list_type
      AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
    WHERE
      lv.visibility = 'friends'
      OR lv.visibility = 'public'
      OR (lv.visibility = 'select_friends' AND fla.id IS NOT NULL)
    GROUP BY u.id, u.name, u.username, u.profile_image
    HAVING COUNT(DISTINCT CONCAT(lv.list_type, '-', COALESCE(lv.list_id::text, 'null'))) > 0
    ORDER BY shared_list_count DESC, u.name
  `;

  return result.rows.map(row => ({
    friendId: row.friend_id,
    friendName: row.friend_name,
    friendUsername: row.friend_username,
    friendImage: row.friend_image,
    sharedListCount: parseInt(row.shared_list_count, 10)
  }));
}

// ============================================================================
// Default Sharing Preferences
// ============================================================================

/**
 * Get default sharing preferences for a user
 */
export async function getDefaultSharingPreferences(userId: number): Promise<Array<{
  listType: string;
  listId: number | null;
  shareByDefault: boolean;
}>> {
  const result = await db`
    SELECT list_type, list_id, share_by_default
    FROM friend_default_sharing
    WHERE user_id = ${userId}
    ORDER BY list_type, list_id
  `;

  return result.rows.map(row => ({
    listType: row.list_type,
    listId: row.list_id,
    shareByDefault: row.share_by_default
  }));
}

/**
 * Set default sharing preference for a list
 */
export async function setDefaultSharingPreference(
  userId: number,
  listType: string,
  shareByDefault: boolean,
  listId: number | null = null
): Promise<void> {
  if (shareByDefault) {
    // Check if record exists
    const existing = await db`
      SELECT id FROM friend_default_sharing
      WHERE user_id = ${userId}
        AND list_type = ${listType}
        AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
    `;

    if (existing.rows.length > 0) {
      await db`
        UPDATE friend_default_sharing
        SET share_by_default = true
        WHERE id = ${existing.rows[0].id}
      `;
    } else {
      await db`
        INSERT INTO friend_default_sharing (user_id, list_type, list_id, share_by_default)
        VALUES (${userId}, ${listType}, ${listId}, true)
      `;
    }
  } else {
    await db`
      DELETE FROM friend_default_sharing
      WHERE user_id = ${userId}
        AND list_type = ${listType}
        AND (list_id = ${listId} OR (list_id IS NULL AND ${listId} IS NULL))
    `;
  }
}

/**
 * Set multiple default sharing preferences at once
 */
export async function setDefaultSharingPreferences(
  userId: number,
  lists: Array<{ listType: string; listId?: number | null; shareByDefault: boolean }>
): Promise<void> {
  // Clear existing preferences
  await db`DELETE FROM friend_default_sharing WHERE user_id = ${userId}`;

  // Insert new preferences (only the ones that should share by default)
  const toShare = lists.filter(l => l.shareByDefault);
  for (const list of toShare) {
    await db`
      INSERT INTO friend_default_sharing (user_id, list_type, list_id, share_by_default)
      VALUES (${userId}, ${list.listType}, ${list.listId ?? null}, true)
    `;
  }
}

/**
 * Apply default sharing preferences when a new friend is added
 */
export async function applyDefaultSharingForNewFriend(
  userId: number,
  newFriendId: number
): Promise<number> {
  const defaults = await getDefaultSharingPreferences(userId);

  let grantedCount = 0;
  for (const pref of defaults) {
    if (pref.shareByDefault) {
      await grantFriendAccess(userId, newFriendId, pref.listType, pref.listId, false);

      // Also set visibility to 'select_friends' if it's still 'private'
      const currentVisibility = await getListVisibility(userId, pref.listType, pref.listId);
      if (currentVisibility === 'private') {
        await setListVisibility(userId, pref.listType, 'select_friends', pref.listId);
      }

      grantedCount++;
    }
  }

  return grantedCount;
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Remove all visibility and access data for a user (for account deletion)
 */
export async function deleteUserVisibilityData(userId: number): Promise<void> {
  await db`DELETE FROM friend_list_access WHERE owner_id = ${userId} OR friend_id = ${userId}`;
  await db`DELETE FROM list_visibility WHERE user_id = ${userId}`;
  await db`DELETE FROM friend_default_sharing WHERE user_id = ${userId}`;
}

/**
 * Clean up access records when a friendship ends
 */
export async function cleanupFriendshipAccess(userId1: number, userId2: number): Promise<void> {
  // Remove access in both directions
  await db`
    DELETE FROM friend_list_access
    WHERE (owner_id = ${userId1} AND friend_id = ${userId2})
       OR (owner_id = ${userId2} AND friend_id = ${userId1})
  `;
}
