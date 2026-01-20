import { db as sql, initDb } from './db';
import { canUserBeInvitedBy, getUserById } from './users';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

export interface PendingInvite {
  id: number;
  customListId: number;
  listName: string;
  listDescription: string | null;
  listIcon: string;
  listColor: string;
  inviterId: number;
  inviterName: string;
  inviterUsername: string | null;
  inviteMessage: string | null;
  invitedAt: Date;
}

export interface SentInvite {
  id: number;
  customListId: number;
  listName: string;
  userId: number;
  userName: string;
  userUsername: string | null;
  inviteMessage: string | null;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: Date;
}

// Get pending invites for a user (invites they haven't accepted/declined yet)
export async function getPendingInvites(userId: number): Promise<PendingInvite[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      clc.id,
      clc.custom_list_id,
      cl.name as list_name,
      cl.description as list_description,
      cl.icon as list_icon,
      cl.color as list_color,
      clc.invited_by as inviter_id,
      u.name as inviter_name,
      u.username as inviter_username,
      clc.invite_message,
      clc.added_at as invited_at
    FROM custom_list_collaborators clc
    JOIN custom_lists cl ON clc.custom_list_id = cl.id
    JOIN users u ON clc.invited_by = u.id
    WHERE clc.user_id = ${userId}
      AND clc.status = 'pending'
      AND clc.invited_by IS NOT NULL
    ORDER BY clc.added_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    customListId: row.custom_list_id,
    listName: row.list_name,
    listDescription: row.list_description,
    listIcon: row.list_icon,
    listColor: row.list_color,
    inviterId: row.inviter_id,
    inviterName: row.inviter_name,
    inviterUsername: row.inviter_username,
    inviteMessage: row.invite_message,
    invitedAt: row.invited_at,
  }));
}

// Get count of pending invites
export async function getPendingInviteCount(userId: number): Promise<number> {
  await ensureDb();

  const result = await sql`
    SELECT COUNT(*)::int as count
    FROM custom_list_collaborators
    WHERE user_id = ${userId}
      AND status = 'pending'
      AND invited_by IS NOT NULL
  `;

  return result.rows[0].count;
}

// Get sent invites (invites the user has sent that are pending)
export async function getSentInvites(userId: number): Promise<SentInvite[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      clc.id,
      clc.custom_list_id,
      cl.name as list_name,
      clc.user_id,
      u.name as user_name,
      u.username as user_username,
      clc.invite_message,
      clc.status,
      clc.added_at as invited_at
    FROM custom_list_collaborators clc
    JOIN custom_lists cl ON clc.custom_list_id = cl.id
    JOIN users u ON clc.user_id = u.id
    WHERE clc.invited_by = ${userId}
      AND clc.status = 'pending'
    ORDER BY clc.added_at DESC
  `;

  return result.rows.map(row => ({
    id: row.id,
    customListId: row.custom_list_id,
    listName: row.list_name,
    userId: row.user_id,
    userName: row.user_name,
    userUsername: row.user_username,
    inviteMessage: row.invite_message,
    status: row.status,
    invitedAt: row.invited_at,
  }));
}

// Send an invite to a user for a custom list
export async function sendListInvite(
  inviterId: number,
  targetUserId: number,
  listSlug: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Check if the user can be invited
  const canInvite = await canUserBeInvitedBy(targetUserId, inviterId);
  if (!canInvite.canInvite) {
    return { success: false, error: canInvite.reason };
  }

  // Get the list
  const listResult = await sql`
    SELECT id, user_id FROM custom_lists WHERE slug = ${listSlug}
  `;

  if (listResult.rows.length === 0) {
    return { success: false, error: 'List not found' };
  }

  const list = listResult.rows[0];

  // Check if inviter owns the list
  if (list.user_id !== inviterId) {
    return { success: false, error: 'Only the list owner can invite collaborators' };
  }

  // Check if user is already a collaborator or has a pending invite
  const existingResult = await sql`
    SELECT id, status FROM custom_list_collaborators
    WHERE custom_list_id = ${list.id} AND user_id = ${targetUserId}
  `;

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    if (existing.status === 'accepted') {
      return { success: false, error: 'User is already a collaborator' };
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'User already has a pending invite' };
    }
    // If declined, allow re-invite by updating the existing row
    await sql`
      UPDATE custom_list_collaborators
      SET status = 'pending',
          invited_by = ${inviterId},
          invite_message = ${message || null},
          added_at = CURRENT_TIMESTAMP,
          declined_at = NULL
      WHERE id = ${existing.id}
    `;
    return { success: true };
  }

  // Create new invite
  try {
    await sql`
      INSERT INTO custom_list_collaborators (custom_list_id, user_id, role, status, invited_by, invite_message, added_at)
      VALUES (${list.id}, ${targetUserId}, 'collaborator', 'pending', ${inviterId}, ${message || null}, CURRENT_TIMESTAMP)
    `;
    return { success: true };
  } catch (error) {
    console.error('Error sending invite:', error);
    return { success: false, error: 'Failed to send invite' };
  }
}

// Accept a pending invite
export async function acceptInvite(
  userId: number,
  inviteId: number
): Promise<{ success: boolean; listSlug?: string; error?: string }> {
  await ensureDb();

  // Get the invite and verify it belongs to the user
  const inviteResult = await sql`
    SELECT clc.id, clc.custom_list_id, cl.slug, cl.id as list_id
    FROM custom_list_collaborators clc
    JOIN custom_lists cl ON clc.custom_list_id = cl.id
    WHERE clc.id = ${inviteId}
      AND clc.user_id = ${userId}
      AND clc.status = 'pending'
  `;

  if (inviteResult.rows.length === 0) {
    return { success: false, error: 'Invite not found or already processed' };
  }

  const invite = inviteResult.rows[0];

  try {
    // Update invite status
    await sql`
      UPDATE custom_list_collaborators
      SET status = 'accepted', added_at = CURRENT_TIMESTAMP
      WHERE id = ${inviteId}
    `;

    // Mark list as shared
    await sql`
      UPDATE custom_lists SET is_shared = true WHERE id = ${invite.list_id}
    `;

    return { success: true, listSlug: invite.slug };
  } catch (error) {
    console.error('Error accepting invite:', error);
    return { success: false, error: 'Failed to accept invite' };
  }
}

// Decline a pending invite
export async function declineInvite(
  userId: number,
  inviteId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    const result = await sql`
      UPDATE custom_list_collaborators
      SET status = 'declined', declined_at = CURRENT_TIMESTAMP
      WHERE id = ${inviteId}
        AND user_id = ${userId}
        AND status = 'pending'
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return { success: false, error: 'Invite not found or already processed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error declining invite:', error);
    return { success: false, error: 'Failed to decline invite' };
  }
}

// Cancel a sent invite
export async function cancelInvite(
  inviterId: number,
  inviteId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    const result = await sql`
      DELETE FROM custom_list_collaborators
      WHERE id = ${inviteId}
        AND invited_by = ${inviterId}
        AND status = 'pending'
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return { success: false, error: 'Invite not found or already processed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error canceling invite:', error);
    return { success: false, error: 'Failed to cancel invite' };
  }
}
