import { sql } from '@vercel/postgres';
import { createNotification } from './show-alerts';
import { createInvite, generateInviteCode, hasPartner, getPartner } from './collaborators';
import type {
  PartnerList,
  PartnerListWithDetails,
  PartnerListMember,
  PartnerListItem,
  PartnerListItemWithDetails,
  PartnerListItemStatus,
} from '@/types/sharing';

// Re-export for convenience
export { hasPartner, getPartner };

// ============================================================================
// Partner Invite Flow
// ============================================================================

export async function createPartnerInvite(
  ownerId: number,
  listName?: string
): Promise<{ success: boolean; inviteCode?: string; expiresAt?: Date; error?: string }> {
  // Check if user already has a partner
  if (await hasPartner(ownerId)) {
    return { success: false, error: 'You already have a partner. Remove your current partner first.' };
  }

  // Check for pending partner invites
  const pendingResult = await sql`
    SELECT id FROM collaborators
    WHERE owner_id = ${ownerId}
    AND type = 'partner'
    AND status = 'pending'
    AND invite_expires_at > NOW()
  `;

  if (pendingResult.rows.length > 0) {
    return { success: false, error: 'You already have a pending partner invite. Revoke it first or wait for it to expire.' };
  }

  // Create the invite with type='partner'
  const { inviteCode, expiresAt, collaboratorId } = await createInvite(ownerId, [], 'partner');

  // Store the list name preference if provided (we'll use it when accepting)
  if (listName) {
    await sql`
      UPDATE collaborators
      SET invite_message = ${listName}
      WHERE id = ${collaboratorId}
    `;
  }

  return { success: true, inviteCode, expiresAt };
}

export async function acceptPartnerInvite(
  inviteCode: string,
  acceptorId: number,
  listName: string = 'Our Watchlist'
): Promise<{ success: boolean; partnerListId?: number; error?: string }> {
  // Get the invite
  const inviteResult = await sql`
    SELECT c.*, u.name as owner_name
    FROM collaborators c
    JOIN users u ON c.owner_id = u.id
    WHERE c.invite_code = ${inviteCode}
    AND c.type = 'partner'
  `;

  if (inviteResult.rows.length === 0) {
    return { success: false, error: 'Partner invite not found' };
  }

  const invite = inviteResult.rows[0];

  // Validations
  if (new Date(invite.invite_expires_at) < new Date()) {
    return { success: false, error: 'Invite has expired' };
  }

  if (invite.status !== 'pending') {
    return { success: false, error: 'Invite has already been used' };
  }

  if (invite.owner_id === acceptorId) {
    return { success: false, error: 'Cannot accept your own invite' };
  }

  // Check if acceptor already has a partner
  if (await hasPartner(acceptorId)) {
    return { success: false, error: 'You already have a partner. Remove your current partner first.' };
  }

  // Accept the invite
  await sql`
    UPDATE collaborators
    SET collaborator_id = ${acceptorId},
        status = 'accepted',
        accepted_at = NOW()
    WHERE id = ${invite.id}
  `;

  // Create the shared partner list
  const listResult = await sql`
    INSERT INTO partner_lists (name)
    VALUES (${listName})
    RETURNING id
  `;

  const partnerListId = listResult.rows[0].id;

  // Add both users as members
  await sql`
    INSERT INTO partner_list_members (partner_list_id, user_id, collaborator_id, role)
    VALUES
      (${partnerListId}, ${invite.owner_id}, ${invite.id}, 'owner'),
      (${partnerListId}, ${acceptorId}, ${invite.id}, 'member')
  `;

  // Notify the inviter
  const acceptorResult = await sql`
    SELECT name FROM users WHERE id = ${acceptorId}
  `;
  const acceptorName = acceptorResult.rows[0]?.name || 'Someone';

  await createNotification({
    user_id: invite.owner_id,
    type: 'collab_accepted',
    title: `${acceptorName} is now your partner!`,
    message: `You're now sharing "${listName}" together`,
    data: {
      accepter_name: acceptorName,
      accepter_id: acceptorId,
      list_name: listName,
    },
  });

  return { success: true, partnerListId };
}

// ============================================================================
// Partner List CRUD
// ============================================================================

export async function getPartnerLists(userId: number): Promise<PartnerListWithDetails[]> {
  const result = await sql`
    SELECT
      pl.*,
      (
        SELECT COUNT(*)::int
        FROM partner_list_items pli
        WHERE pli.partner_list_id = pl.id
      ) as item_count,
      (
        SELECT COUNT(*)::int
        FROM partner_list_items pli
        WHERE pli.partner_list_id = pl.id
        AND (
          SELECT COUNT(*) FROM partner_list_item_status plis
          WHERE plis.item_id = pli.id AND plis.watched = true
        ) = (
          SELECT COUNT(*) FROM partner_list_members plm
          WHERE plm.partner_list_id = pl.id
        )
      ) as watched_together_count
    FROM partner_lists pl
    JOIN partner_list_members plm ON plm.partner_list_id = pl.id
    WHERE plm.user_id = ${userId}
    ORDER BY pl.created_at DESC
  `;

  const lists: PartnerListWithDetails[] = [];

  for (const row of result.rows) {
    // Get members for this list
    const membersResult = await sql`
      SELECT
        plm.*,
        u.name as user_name,
        u.profile_image as user_image
      FROM partner_list_members plm
      JOIN users u ON u.id = plm.user_id
      WHERE plm.partner_list_id = ${row.id}
    `;

    lists.push({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      item_count: row.item_count,
      watched_together_count: row.watched_together_count,
      members: membersResult.rows as PartnerListMember[],
    });
  }

  return lists;
}

export async function getPartnerList(
  listId: number,
  userId: number
): Promise<PartnerListWithDetails | null> {
  // Verify user is a member
  const memberCheck = await sql`
    SELECT id FROM partner_list_members
    WHERE partner_list_id = ${listId} AND user_id = ${userId}
  `;

  if (memberCheck.rows.length === 0) {
    return null;
  }

  const result = await sql`
    SELECT
      pl.*,
      (SELECT COUNT(*)::int FROM partner_list_items WHERE partner_list_id = pl.id) as item_count,
      (
        SELECT COUNT(*)::int
        FROM partner_list_items pli
        WHERE pli.partner_list_id = pl.id
        AND (
          SELECT COUNT(*) FROM partner_list_item_status plis
          WHERE plis.item_id = pli.id AND plis.watched = true
        ) = (
          SELECT COUNT(*) FROM partner_list_members plm
          WHERE plm.partner_list_id = pl.id
        )
      ) as watched_together_count
    FROM partner_lists pl
    WHERE pl.id = ${listId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Get members
  const membersResult = await sql`
    SELECT
      plm.*,
      u.name as user_name,
      u.profile_image as user_image
    FROM partner_list_members plm
    JOIN users u ON u.id = plm.user_id
    WHERE plm.partner_list_id = ${listId}
  `;

  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    item_count: row.item_count,
    watched_together_count: row.watched_together_count,
    members: membersResult.rows as PartnerListMember[],
  };
}

export async function createPartnerList(
  userId: number,
  name: string
): Promise<{ success: boolean; listId?: number; error?: string }> {
  // Get user's partner
  const partner = await getPartner(userId);
  if (!partner) {
    return { success: false, error: 'You need a partner to create a shared list' };
  }

  // Create the list
  const result = await sql`
    INSERT INTO partner_lists (name)
    VALUES (${name})
    RETURNING id
  `;

  const listId = result.rows[0].id;

  // Get the collaborator ID
  const collabResult = await sql`
    SELECT id FROM collaborators
    WHERE ((owner_id = ${userId} AND collaborator_id = ${partner.userId})
       OR (owner_id = ${partner.userId} AND collaborator_id = ${userId}))
    AND type = 'partner'
    AND status = 'accepted'
    LIMIT 1
  `;

  const collaboratorId = collabResult.rows[0]?.id;

  // Add both users as members
  await sql`
    INSERT INTO partner_list_members (partner_list_id, user_id, collaborator_id, role)
    VALUES
      (${listId}, ${userId}, ${collaboratorId}, 'owner'),
      (${listId}, ${partner.userId}, ${collaboratorId}, 'member')
  `;

  return { success: true, listId };
}

export async function renamePartnerList(
  listId: number,
  userId: number,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  // Verify user is a member
  const memberCheck = await sql`
    SELECT id FROM partner_list_members
    WHERE partner_list_id = ${listId} AND user_id = ${userId}
  `;

  if (memberCheck.rows.length === 0) {
    return { success: false, error: 'List not found' };
  }

  await sql`
    UPDATE partner_lists SET name = ${newName} WHERE id = ${listId}
  `;

  return { success: true };
}

export async function deletePartnerList(
  listId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  // Verify user is a member
  const memberCheck = await sql`
    SELECT id FROM partner_list_members
    WHERE partner_list_id = ${listId} AND user_id = ${userId}
  `;

  if (memberCheck.rows.length === 0) {
    return { success: false, error: 'List not found' };
  }

  // Delete cascades to members, items, and statuses
  await sql`DELETE FROM partner_lists WHERE id = ${listId}`;

  return { success: true };
}

// ============================================================================
// Partner List Items
// ============================================================================

export async function getPartnerListItems(
  listId: number,
  userId: number,
  options: {
    filter?: 'all' | 'unwatched' | 'watched_together' | 'watched_solo';
    limit?: number;
    offset?: number;
  } = {}
): Promise<PartnerListItemWithDetails[]> {
  const { filter = 'all', limit = 50, offset = 0 } = options;

  // Verify user is a member
  const memberCheck = await sql`
    SELECT id FROM partner_list_members
    WHERE partner_list_id = ${listId} AND user_id = ${userId}
  `;

  if (memberCheck.rows.length === 0) {
    return [];
  }

  // Get member count for watched_together calculation
  const memberCountResult = await sql`
    SELECT COUNT(*)::int as count FROM partner_list_members
    WHERE partner_list_id = ${listId}
  `;
  const memberCount = memberCountResult.rows[0].count;

  // Build query based on filter
  let filterClause = '';
  if (filter === 'unwatched') {
    filterClause = `
      AND (
        SELECT COUNT(*) FROM partner_list_item_status plis
        WHERE plis.item_id = pli.id AND plis.watched = true
      ) = 0
    `;
  } else if (filter === 'watched_together') {
    filterClause = `
      AND (
        SELECT COUNT(*) FROM partner_list_item_status plis
        WHERE plis.item_id = pli.id AND plis.watched = true
      ) = ${memberCount}
    `;
  } else if (filter === 'watched_solo') {
    filterClause = `
      AND (
        SELECT COUNT(*) FROM partner_list_item_status plis
        WHERE plis.item_id = pli.id AND plis.watched = true
      ) BETWEEN 1 AND ${memberCount - 1}
    `;
  }

  const result = await sql.query(`
    SELECT
      pli.*,
      m.title as media_title,
      m.poster_path as media_poster_path,
      m.media_type,
      m.tmdb_id as media_tmdb_id,
      m.release_year as media_release_year,
      adder.name as added_by_name,
      adder.profile_image as added_by_image
    FROM partner_list_items pli
    JOIN media m ON m.id = pli.media_id
    LEFT JOIN users adder ON adder.id = pli.added_by_user_id
    WHERE pli.partner_list_id = $1
    ${filterClause}
    ORDER BY pli.created_at DESC
    LIMIT $2 OFFSET $3
  `, [listId, limit, offset]);

  const items: PartnerListItemWithDetails[] = [];

  for (const row of result.rows) {
    // Get statuses for this item
    const statusesResult = await sql`
      SELECT
        plis.*,
        u.name as user_name,
        u.profile_image as user_image
      FROM partner_list_item_status plis
      JOIN users u ON u.id = plis.user_id
      WHERE plis.item_id = ${row.id}
    `;

    const statuses = statusesResult.rows as PartnerListItemStatus[];
    const watchedByUserIds = statuses.filter(s => s.watched).map(s => s.user_id);

    items.push({
      id: row.id,
      partner_list_id: row.partner_list_id,
      media_id: row.media_id,
      added_by_user_id: row.added_by_user_id,
      created_at: row.created_at,
      media_title: row.media_title,
      media_poster_path: row.media_poster_path,
      media_type: row.media_type,
      media_tmdb_id: row.media_tmdb_id,
      media_release_year: row.media_release_year,
      added_by_name: row.added_by_name,
      added_by_image: row.added_by_image,
      statuses,
      is_watched_together: watchedByUserIds.length === memberCount,
      watched_by_user_ids: watchedByUserIds,
    });
  }

  return items;
}

export async function addToPartnerList(
  listId: number,
  userId: number,
  mediaData: {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    releaseYear?: number;
  }
): Promise<{ success: boolean; itemId?: number; error?: string }> {
  // Verify user is a member
  const memberCheck = await sql`
    SELECT id FROM partner_list_members
    WHERE partner_list_id = ${listId} AND user_id = ${userId}
  `;

  if (memberCheck.rows.length === 0) {
    return { success: false, error: 'List not found' };
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
    WHERE partner_list_id = ${listId} AND media_id = ${mediaId}
  `;

  if (existingResult.rows.length > 0) {
    return { success: false, error: 'Already in list' };
  }

  // Add to list
  const itemResult = await sql`
    INSERT INTO partner_list_items (partner_list_id, media_id, added_by_user_id)
    VALUES (${listId}, ${mediaId}, ${userId})
    RETURNING id
  `;

  const itemId = itemResult.rows[0].id;

  // Initialize status for all members (unwatched)
  const membersResult = await sql`
    SELECT user_id FROM partner_list_members WHERE partner_list_id = ${listId}
  `;

  for (const member of membersResult.rows) {
    await sql`
      INSERT INTO partner_list_item_status (item_id, user_id, watched)
      VALUES (${itemId}, ${member.user_id}, false)
    `;
  }

  return { success: true, itemId };
}

export async function removeFromPartnerList(
  itemId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  // Verify user is a member of the list that contains this item
  const itemCheck = await sql`
    SELECT pli.id
    FROM partner_list_items pli
    JOIN partner_list_members plm ON plm.partner_list_id = pli.partner_list_id
    WHERE pli.id = ${itemId} AND plm.user_id = ${userId}
  `;

  if (itemCheck.rows.length === 0) {
    return { success: false, error: 'Item not found' };
  }

  // Delete cascades to statuses
  await sql`DELETE FROM partner_list_items WHERE id = ${itemId}`;

  return { success: true };
}

// ============================================================================
// Watched Status
// ============================================================================

export async function updateItemStatus(
  itemId: number,
  userId: number,
  updates: { watched?: boolean; rating?: number | null }
): Promise<{ success: boolean; error?: string }> {
  // Verify user has a status record for this item
  const statusCheck = await sql`
    SELECT id FROM partner_list_item_status
    WHERE item_id = ${itemId} AND user_id = ${userId}
  `;

  if (statusCheck.rows.length === 0) {
    return { success: false, error: 'Item not found' };
  }

  const setClauses: string[] = ['updated_at = NOW()'];
  const values: (boolean | number | null)[] = [];
  let paramIndex = 1;

  if (updates.watched !== undefined) {
    setClauses.push(`watched = $${paramIndex}`);
    values.push(updates.watched);
    paramIndex++;

    if (updates.watched) {
      setClauses.push(`watched_at = NOW()`);
    } else {
      setClauses.push(`watched_at = NULL`);
    }
  }

  if (updates.rating !== undefined) {
    setClauses.push(`rating = $${paramIndex}`);
    values.push(updates.rating);
    paramIndex++;
  }

  values.push(itemId, userId);

  await sql.query(
    `UPDATE partner_list_item_status
     SET ${setClauses.join(', ')}
     WHERE item_id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
    values
  );

  return { success: true };
}

export async function markWatchedSolo(
  itemId: number,
  userId: number,
  rating?: number
): Promise<{ success: boolean; error?: string }> {
  return updateItemStatus(itemId, userId, { watched: true, rating });
}

export async function markWatchedTogether(
  itemId: number,
  userId: number,
  rating?: number
): Promise<{ success: boolean; error?: string }> {
  // Get all member user IDs for this item's list
  const membersResult = await sql`
    SELECT plm.user_id
    FROM partner_list_members plm
    JOIN partner_list_items pli ON pli.partner_list_id = plm.partner_list_id
    WHERE pli.id = ${itemId}
  `;

  if (membersResult.rows.length === 0) {
    return { success: false, error: 'Item not found' };
  }

  // Mark watched for all members
  for (const member of membersResult.rows) {
    await sql`
      UPDATE partner_list_item_status
      SET watched = true, watched_at = NOW(), updated_at = NOW()
      WHERE item_id = ${itemId} AND user_id = ${member.user_id}
    `;
  }

  // Set the rating for the user who initiated
  if (rating !== undefined) {
    await sql`
      UPDATE partner_list_item_status
      SET rating = ${rating}
      WHERE item_id = ${itemId} AND user_id = ${userId}
    `;
  }

  return { success: true };
}

export async function unmarkWatched(
  itemId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  return updateItemStatus(itemId, userId, { watched: false, rating: null });
}

// ============================================================================
// Partner Removal
// ============================================================================

export async function removePartner(
  userId: number
): Promise<{ success: boolean; error?: string }> {
  const partner = await getPartner(userId);
  if (!partner) {
    return { success: false, error: 'You don\'t have a partner' };
  }

  // Get the collaborator record
  const collabResult = await sql`
    SELECT id FROM collaborators
    WHERE ((owner_id = ${userId} AND collaborator_id = ${partner.userId})
       OR (owner_id = ${partner.userId} AND collaborator_id = ${userId}))
    AND type = 'partner'
    AND status = 'accepted'
  `;

  if (collabResult.rows.length === 0) {
    return { success: false, error: 'Partner relationship not found' };
  }

  const collaboratorId = collabResult.rows[0].id;

  // Delete all partner lists associated with this relationship
  await sql`
    DELETE FROM partner_lists
    WHERE id IN (
      SELECT partner_list_id FROM partner_list_members
      WHERE collaborator_id = ${collaboratorId}
    )
  `;

  // Delete the collaborator record
  await sql`DELETE FROM collaborators WHERE id = ${collaboratorId}`;

  // Notify the partner
  const userResult = await sql`SELECT name FROM users WHERE id = ${userId}`;
  const userName = userResult.rows[0]?.name || 'Your partner';

  await createNotification({
    user_id: partner.userId,
    type: 'collab_ended',
    title: `${userName} ended your partner connection`,
    message: 'Your shared lists have been removed',
    data: {
      ender_name: userName,
      ender_id: userId,
    },
  });

  return { success: true };
}
