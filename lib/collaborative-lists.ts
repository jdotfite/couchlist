import { sql } from '@vercel/postgres';
import { areFriends } from './friends';

export interface CollaborativeList {
  id: number;
  name: string;
  createdAt: Date;
  itemCount: number;
  members: CollaborativeListMember[];
}

export interface CollaborativeListMember {
  userId: number;
  name: string;
  image: string | null;
  role: string;
}

export interface CollaborativeListItem {
  id: number;
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  addedByUserId: number;
  addedByName: string;
  addedByImage: string | null;
  createdAt: Date;
}

// ============================================================================
// Get Collaborative List Between Two Friends
// ============================================================================

export async function getCollaborativeList(
  userId: number,
  friendUserId: number
): Promise<CollaborativeList | null> {
  // Verify friendship
  if (!(await areFriends(userId, friendUserId))) {
    return null;
  }

  // Find a partner_list that has both users as members
  const result = await sql`
    SELECT pl.id, pl.name, pl.created_at
    FROM partner_lists pl
    WHERE EXISTS (
      SELECT 1 FROM partner_list_members plm1
      WHERE plm1.partner_list_id = pl.id AND plm1.user_id = ${userId}
    )
    AND EXISTS (
      SELECT 1 FROM partner_list_members plm2
      WHERE plm2.partner_list_id = pl.id AND plm2.user_id = ${friendUserId}
    )
    AND (
      SELECT COUNT(*) FROM partner_list_members plm
      WHERE plm.partner_list_id = pl.id
    ) = 2
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const list = result.rows[0];

  // Get item count
  const countResult = await sql`
    SELECT COUNT(*)::int as count FROM partner_list_items
    WHERE partner_list_id = ${list.id}
  `;

  // Get members
  const membersResult = await sql`
    SELECT plm.user_id, plm.role, u.name, u.profile_image as image
    FROM partner_list_members plm
    JOIN users u ON u.id = plm.user_id
    WHERE plm.partner_list_id = ${list.id}
  `;

  return {
    id: list.id,
    name: list.name,
    createdAt: list.created_at,
    itemCount: countResult.rows[0].count,
    members: membersResult.rows.map(m => ({
      userId: m.user_id,
      name: m.name,
      image: m.image,
      role: m.role
    }))
  };
}

// ============================================================================
// Create Collaborative List
// ============================================================================

export async function createCollaborativeList(
  userId: number,
  friendUserId: number,
  name?: string
): Promise<{ success: boolean; list?: CollaborativeList; error?: string }> {
  // Verify friendship
  if (!(await areFriends(userId, friendUserId))) {
    return { success: false, error: 'You must be friends to create a collaborative list' };
  }

  // Check if they already have a collaborative list
  const existing = await getCollaborativeList(userId, friendUserId);
  if (existing) {
    return { success: false, error: 'You already have a collaborative list with this friend' };
  }

  // Get both users' names for default list name
  const usersResult = await sql`
    SELECT id, name FROM users WHERE id IN (${userId}, ${friendUserId})
  `;

  const userNames = usersResult.rows.reduce((acc, row) => {
    acc[row.id] = row.name;
    return acc;
  }, {} as Record<number, string>);

  const defaultName = name || `${userNames[userId]} & ${userNames[friendUserId]}`;

  // Create the list
  const listResult = await sql`
    INSERT INTO partner_lists (name)
    VALUES (${defaultName})
    RETURNING id, name, created_at
  `;

  const listId = listResult.rows[0].id;

  // Add both users as members (no collaborator_id needed for friend-based lists)
  await sql`
    INSERT INTO partner_list_members (partner_list_id, user_id, role)
    VALUES
      (${listId}, ${userId}, 'owner'),
      (${listId}, ${friendUserId}, 'member')
  `;

  // Return the created list
  const list = await getCollaborativeList(userId, friendUserId);

  return { success: true, list: list! };
}

// ============================================================================
// Rename Collaborative List
// ============================================================================

export async function renameCollaborativeList(
  userId: number,
  friendUserId: number,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  const list = await getCollaborativeList(userId, friendUserId);
  if (!list) {
    return { success: false, error: 'Collaborative list not found' };
  }

  await sql`
    UPDATE partner_lists SET name = ${newName} WHERE id = ${list.id}
  `;

  return { success: true };
}

// ============================================================================
// Delete Collaborative List
// ============================================================================

export async function deleteCollaborativeList(
  userId: number,
  friendUserId: number
): Promise<{ success: boolean; error?: string }> {
  const list = await getCollaborativeList(userId, friendUserId);
  if (!list) {
    return { success: false, error: 'Collaborative list not found' };
  }

  // Delete cascades to members and items
  await sql`DELETE FROM partner_lists WHERE id = ${list.id}`;

  return { success: true };
}

// ============================================================================
// Get Collaborative List Items
// ============================================================================

export async function getCollaborativeListItems(
  userId: number,
  friendUserId: number,
  options: { limit?: number; offset?: number } = {}
): Promise<CollaborativeListItem[]> {
  const { limit = 50, offset = 0 } = options;

  const list = await getCollaborativeList(userId, friendUserId);
  if (!list) {
    return [];
  }

  const result = await sql`
    SELECT
      pli.id,
      pli.media_id,
      pli.added_by_user_id,
      pli.created_at,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.poster_path,
      m.release_year,
      u.name as added_by_name,
      u.profile_image as added_by_image
    FROM partner_list_items pli
    JOIN media m ON m.id = pli.media_id
    LEFT JOIN users u ON u.id = pli.added_by_user_id
    WHERE pli.partner_list_id = ${list.id}
    ORDER BY pli.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return result.rows.map(row => ({
    id: row.id,
    mediaId: row.media_id,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    posterPath: row.poster_path,
    releaseYear: row.release_year,
    addedByUserId: row.added_by_user_id,
    addedByName: row.added_by_name,
    addedByImage: row.added_by_image,
    createdAt: row.created_at
  }));
}

// ============================================================================
// Add Item to Collaborative List
// ============================================================================

export async function addToCollaborativeList(
  userId: number,
  friendUserId: number,
  mediaData: {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    releaseYear?: number;
  }
): Promise<{ success: boolean; itemId?: number; error?: string }> {
  const list = await getCollaborativeList(userId, friendUserId);
  if (!list) {
    return { success: false, error: 'Collaborative list not found' };
  }

  // Ensure media exists in catalog
  const mediaResult = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path, release_year)
    VALUES (${mediaData.tmdbId}, ${mediaData.mediaType}, ${mediaData.title}, ${mediaData.posterPath || null}, ${mediaData.releaseYear || null})
    ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
      title = EXCLUDED.title,
      poster_path = COALESCE(EXCLUDED.poster_path, media.poster_path),
      release_year = COALESCE(EXCLUDED.release_year, media.release_year)
    RETURNING id
  `;

  const mediaId = mediaResult.rows[0].id;

  // Check if already in list
  const existingResult = await sql`
    SELECT id FROM partner_list_items
    WHERE partner_list_id = ${list.id} AND media_id = ${mediaId}
  `;

  if (existingResult.rows.length > 0) {
    return { success: false, error: 'Already in list' };
  }

  // Add to list
  const itemResult = await sql`
    INSERT INTO partner_list_items (partner_list_id, media_id, added_by_user_id)
    VALUES (${list.id}, ${mediaId}, ${userId})
    RETURNING id
  `;

  return { success: true, itemId: itemResult.rows[0].id };
}

// ============================================================================
// Remove Item from Collaborative List
// ============================================================================

export async function removeFromCollaborativeList(
  userId: number,
  friendUserId: number,
  itemId: number
): Promise<{ success: boolean; error?: string }> {
  const list = await getCollaborativeList(userId, friendUserId);
  if (!list) {
    return { success: false, error: 'Collaborative list not found' };
  }

  // Verify item belongs to this list
  const itemCheck = await sql`
    SELECT id FROM partner_list_items
    WHERE id = ${itemId} AND partner_list_id = ${list.id}
  `;

  if (itemCheck.rows.length === 0) {
    return { success: false, error: 'Item not found in list' };
  }

  await sql`DELETE FROM partner_list_items WHERE id = ${itemId}`;

  return { success: true };
}

// ============================================================================
// Mark Item as Watched (with options)
// ============================================================================

export async function markCollaborativeItemWatched(
  userId: number,
  friendUserId: number,
  itemId: number,
  options: {
    moveToFinished: boolean;
    rating?: number;
    watchedNote?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const list = await getCollaborativeList(userId, friendUserId);
  if (!list) {
    return { success: false, error: 'Collaborative list not found' };
  }

  // Get the item details
  const itemResult = await sql`
    SELECT pli.*, m.tmdb_id, m.media_type, m.title, m.poster_path, m.release_year
    FROM partner_list_items pli
    JOIN media m ON m.id = pli.media_id
    WHERE pli.id = ${itemId} AND pli.partner_list_id = ${list.id}
  `;

  if (itemResult.rows.length === 0) {
    return { success: false, error: 'Item not found in list' };
  }

  const item = itemResult.rows[0];

  if (options.moveToFinished) {
    // Get both users' names for the "watched with" note
    const usersResult = await sql`
      SELECT id, name FROM users WHERE id IN (${userId}, ${friendUserId})
    `;
    const userNames = usersResult.rows.reduce((acc, row) => {
      acc[row.id] = row.name;
      return acc;
    }, {} as Record<number, string>);

    // Add to both users' finished lists
    for (const memberId of [userId, friendUserId]) {
      const otherMemberId = memberId === userId ? friendUserId : userId;
      const watchedWithNote = `Watched with ${userNames[otherMemberId]}`;

      // Check if already in user_media for this user
      const existingResult = await sql`
        SELECT um.id FROM user_media um
        JOIN media m ON m.id = um.media_id
        WHERE um.user_id = ${memberId}
        AND m.tmdb_id = ${item.tmdb_id}
        AND m.media_type = ${item.media_type}
      `;

      if (existingResult.rows.length > 0) {
        // Update existing entry to finished
        const notes = options.watchedNote
          ? `${watchedWithNote}. ${options.watchedNote}`
          : watchedWithNote;

        await sql`
          UPDATE user_media
          SET status = 'finished',
              watched_date = NOW(),
              notes = ${notes},
              rating = COALESCE(${options.rating || null}, rating),
              updated_at = NOW()
          WHERE id = ${existingResult.rows[0].id}
        `;
      } else {
        // Create new entry as finished
        const notes = options.watchedNote
          ? `${watchedWithNote}. ${options.watchedNote}`
          : watchedWithNote;

        await sql`
          INSERT INTO user_media (user_id, media_id, status, rating, notes, watched_date)
          VALUES (
            ${memberId},
            ${item.media_id},
            'finished',
            ${options.rating || null},
            ${notes},
            NOW()
          )
        `;
      }
    }
  }

  // Remove from collaborative list
  await sql`DELETE FROM partner_list_items WHERE id = ${itemId}`;

  return { success: true };
}

// ============================================================================
// Get All Collaborative Lists for a User
// ============================================================================

export async function getUserCollaborativeLists(
  userId: number
): Promise<Array<CollaborativeList & { friendUserId: number; friendName: string; friendImage: string | null }>> {
  // Find all partner_lists where this user is a member and there are exactly 2 members
  const result = await sql`
    SELECT
      pl.id,
      pl.name,
      pl.created_at,
      (SELECT COUNT(*)::int FROM partner_list_items WHERE partner_list_id = pl.id) as item_count,
      other_member.user_id as friend_user_id,
      u.name as friend_name,
      u.profile_image as friend_image
    FROM partner_lists pl
    JOIN partner_list_members my_membership ON my_membership.partner_list_id = pl.id AND my_membership.user_id = ${userId}
    JOIN partner_list_members other_member ON other_member.partner_list_id = pl.id AND other_member.user_id != ${userId}
    JOIN users u ON u.id = other_member.user_id
    WHERE (
      SELECT COUNT(*) FROM partner_list_members WHERE partner_list_id = pl.id
    ) = 2
    ORDER BY pl.created_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    itemCount: row.item_count,
    members: [], // Not fetching full member details here for performance
    friendUserId: row.friend_user_id,
    friendName: row.friend_name,
    friendImage: row.friend_image
  }));
}
