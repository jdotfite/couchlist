import { sql } from '@vercel/postgres';
import { createNotification } from './show-alerts';
import { createInvite, getFriends as getCollaboratorFriends, areFriends } from './collaborators';
import { getSuggestionStats } from './suggestions';
import type { Friend } from '@/types/sharing';

// Re-export for convenience
export { areFriends };

// ============================================================================
// Friend Invite Flow
// ============================================================================

export async function createFriendInvite(
  ownerId: number
): Promise<{ success: boolean; inviteCode?: string; expiresAt?: Date; error?: string }> {
  // Create the invite with type='friend'
  const { inviteCode, expiresAt } = await createInvite(ownerId, [], 'friend');

  return { success: true, inviteCode, expiresAt };
}

export async function acceptFriendInvite(
  inviteCode: string,
  acceptorId: number
): Promise<{ success: boolean; error?: string }> {
  // Get the invite
  const inviteResult = await sql`
    SELECT c.*, u.name as owner_name
    FROM collaborators c
    JOIN users u ON c.owner_id = u.id
    WHERE c.invite_code = ${inviteCode}
    AND c.type = 'friend'
  `;

  if (inviteResult.rows.length === 0) {
    return { success: false, error: 'Friend invite not found' };
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

  // Check if already friends
  if (await areFriends(invite.owner_id, acceptorId)) {
    return { success: false, error: 'You are already friends' };
  }

  // Accept the invite
  await sql`
    UPDATE collaborators
    SET collaborator_id = ${acceptorId},
        status = 'accepted',
        accepted_at = NOW()
    WHERE id = ${invite.id}
  `;

  // Notify the inviter
  const acceptorResult = await sql`
    SELECT name FROM users WHERE id = ${acceptorId}
  `;
  const acceptorName = acceptorResult.rows[0]?.name || 'Someone';

  await createNotification({
    user_id: invite.owner_id,
    type: 'collab_accepted',
    title: `${acceptorName} is now your friend!`,
    message: 'You can now suggest titles to each other',
    data: {
      accepter_name: acceptorName,
      accepter_id: acceptorId,
    },
  });

  return { success: true };
}

// ============================================================================
// Get Friends
// ============================================================================

export async function getFriends(userId: number): Promise<Friend[]> {
  const friends = await getCollaboratorFriends(userId);

  // Enhance with suggestion stats
  const enhancedFriends: Friend[] = [];

  for (const friend of friends) {
    // Count suggestions between this user and the friend
    const sentResult = await sql`
      SELECT COUNT(*)::int as count FROM friend_suggestions
      WHERE from_user_id = ${userId} AND to_user_id = ${friend.userId}
    `;

    const receivedResult = await sql`
      SELECT COUNT(*)::int as count FROM friend_suggestions
      WHERE from_user_id = ${friend.userId} AND to_user_id = ${userId}
    `;

    enhancedFriends.push({
      id: friend.collaboratorId,
      user_id: friend.userId,
      name: friend.name,
      username: friend.username,
      image: friend.image,
      connected_at: friend.connectedAt.toISOString(),
      suggestions_sent: sentResult.rows[0].count,
      suggestions_received: receivedResult.rows[0].count,
    });
  }

  return enhancedFriends;
}

export async function getFriend(
  userId: number,
  friendUserId: number
): Promise<Friend | null> {
  const friends = await getFriends(userId);
  return friends.find(f => f.user_id === friendUserId) || null;
}

// ============================================================================
// Remove Friend
// ============================================================================

export async function removeFriend(
  userId: number,
  collaboratorId: number
): Promise<{ success: boolean; error?: string }> {
  // Get the collaborator record
  const collabResult = await sql`
    SELECT c.*,
           CASE WHEN c.owner_id = ${userId} THEN collab.name ELSE owner.name END as other_name,
           CASE WHEN c.owner_id = ${userId} THEN c.collaborator_id ELSE c.owner_id END as other_user_id
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE c.id = ${collaboratorId}
    AND c.type = 'friend'
    AND c.status = 'accepted'
    AND (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
  `;

  if (collabResult.rows.length === 0) {
    return { success: false, error: 'Friend connection not found' };
  }

  const collab = collabResult.rows[0];
  const otherUserId = collab.other_user_id;

  // Delete the collaborator record
  await sql`DELETE FROM collaborators WHERE id = ${collaboratorId}`;

  // Get user's name for notification
  const userResult = await sql`SELECT name FROM users WHERE id = ${userId}`;
  const userName = userResult.rows[0]?.name || 'Someone';

  // Notify the other person
  if (otherUserId) {
    await createNotification({
      user_id: otherUserId,
      type: 'collab_ended',
      title: `${userName} removed you as a friend`,
      message: 'You can no longer suggest titles to each other',
      data: {
        ender_name: userName,
        ender_id: userId,
      },
    });
  }

  return { success: true };
}

// ============================================================================
// Friend Stats
// ============================================================================

export async function getFriendStats(userId: number): Promise<{
  totalFriends: number;
  pendingSuggestions: number;
  sentSuggestions: number;
}> {
  const friends = await getFriends(userId);
  const suggestionStats = await getSuggestionStats(userId);

  return {
    totalFriends: friends.length,
    pendingSuggestions: suggestionStats.pendingReceived,
    sentSuggestions: suggestionStats.pendingSent,
  };
}
