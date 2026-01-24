import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { createNotification } from './show-alerts';

// Types
export type CollaboratorType = 'partner' | 'friend';

export interface Collaborator {
  id: number;
  owner_id: number;
  collaborator_id: number | null;
  invite_code: string;
  invite_expires_at: Date;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  type: CollaboratorType;
  created_at: Date;
  accepted_at: Date | null;
}

export interface CollaboratorWithUser extends Collaborator {
  owner_name: string;
  owner_email: string;
  owner_image: string | null;
  owner_username?: string | null;
  collaborator_name: string | null;
  collaborator_email: string | null;
  collaborator_username?: string | null;
  collaborator_image?: string | null;
}

export interface SharedList {
  id: number;
  collaborator_id: number;
  list_type: string;
  is_active: boolean;
  created_at: Date;
}

// Generate a secure random invite code
export function generateInviteCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Create a new collaboration invite
export async function createInvite(
  ownerId: number,
  lists: string[] = [],
  type: CollaboratorType = 'friend'
): Promise<{ inviteCode: string; expiresAt: Date; collaboratorId: number }> {
  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Create the collaboration record
  const result = await sql`
    INSERT INTO collaborators (owner_id, invite_code, invite_expires_at, status, type)
    VALUES (${ownerId}, ${inviteCode}, ${expiresAt.toISOString()}, 'pending', ${type})
    RETURNING id
  `;

  const collaboratorId = result.rows[0].id;

  // Add the shared lists (for friend type, these are the lists they can add to)
  for (const listType of lists) {
    await sql`
      INSERT INTO shared_lists (collaborator_id, list_type)
      VALUES (${collaboratorId}, ${listType})
    `;
  }

  return { inviteCode, expiresAt, collaboratorId };
}

// Get invite details by code
export async function getInviteByCode(inviteCode: string): Promise<{
  collaboration: CollaboratorWithUser;
  sharedLists: string[];
} | null> {
  const result = await sql`
    SELECT
      c.*,
      owner.name as owner_name,
      owner.email as owner_email,
      owner.profile_image as owner_image,
      collab.name as collaborator_name,
      collab.email as collaborator_email
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE c.invite_code = ${inviteCode}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const collaboration = result.rows[0] as CollaboratorWithUser;

  // Get shared lists
  const listsResult = await sql`
    SELECT list_type FROM shared_lists
    WHERE collaborator_id = ${collaboration.id}
  `;

  const sharedLists = listsResult.rows.map(r => r.list_type);

  return { collaboration, sharedLists };
}

// Accept an invite
export async function acceptInvite(
  inviteCode: string,
  userId: number,
  selectedLists: string[],
  mergeItems: boolean = true
): Promise<{ success: boolean; error?: string; duplicatesCount?: number }> {
  // Get the invite
  const invite = await getInviteByCode(inviteCode);

  if (!invite) {
    return { success: false, error: 'Invite not found' };
  }

  const { collaboration } = invite;

  // Check if expired
  if (new Date(collaboration.invite_expires_at) < new Date()) {
    return { success: false, error: 'Invite has expired' };
  }

  // Check if already accepted
  if (collaboration.status !== 'pending') {
    return { success: false, error: 'Invite has already been used' };
  }

  // Check if user is trying to accept their own invite
  if (collaboration.owner_id === userId) {
    return { success: false, error: 'Cannot accept your own invite' };
  }

  // Check if collaboration already exists between these users
  const existingResult = await sql`
    SELECT id FROM collaborators
    WHERE status = 'accepted'
    AND (
      (owner_id = ${collaboration.owner_id} AND collaborator_id = ${userId})
      OR (owner_id = ${userId} AND collaborator_id = ${collaboration.owner_id})
    )
  `;

  if (existingResult.rows.length > 0) {
    return { success: false, error: 'You are already collaborating with this user' };
  }

  // Update the collaboration
  await sql`
    UPDATE collaborators
    SET collaborator_id = ${userId},
        status = 'accepted',
        accepted_at = NOW()
    WHERE id = ${collaboration.id}
  `;

  // Update shared lists to only include selected ones
  await sql`
    UPDATE shared_lists
    SET is_active = false
    WHERE collaborator_id = ${collaboration.id}
  `;

  for (const listType of selectedLists) {
    await sql`
      UPDATE shared_lists
      SET is_active = true
      WHERE collaborator_id = ${collaboration.id}
      AND list_type = ${listType}
    `;
  }

  // Count duplicates - media that both users have in the selected lists
  let duplicatesCount = 0;

  if (selectedLists.length > 0) {
    // Build list of status types and tag types
    const statusLists = selectedLists.filter(l =>
      ['watchlist', 'watching', 'finished', 'onhold', 'dropped'].includes(l)
    );
    const tagLists = selectedLists.filter(l =>
      ['favorites', 'rewatch', 'nostalgia'].includes(l)
    );

    // Count duplicates in status-based lists
    if (statusLists.length > 0) {
      const statusListStr = statusLists.join(',');
      const statusDuplicates = await sql`
        SELECT COUNT(DISTINCT owner_media.media_id) as count
        FROM user_media owner_media
        JOIN user_media collab_media ON owner_media.media_id = collab_media.media_id
        WHERE owner_media.user_id = ${collaboration.owner_id}
        AND collab_media.user_id = ${userId}
        AND owner_media.status = ANY(string_to_array(${statusListStr}, ','))
        AND collab_media.status = ANY(string_to_array(${statusListStr}, ','))
      `;
      duplicatesCount += parseInt(statusDuplicates.rows[0]?.count || '0', 10);
    }

    // Count duplicates in tag-based lists
    if (tagLists.length > 0) {
      const tagListStr = tagLists.join(',');
      const tagDuplicates = await sql`
        SELECT COUNT(DISTINCT owner_um.media_id) as count
        FROM user_media owner_um
        JOIN user_media_tags owner_umt ON owner_um.id = owner_umt.user_media_id
        JOIN tags owner_tag ON owner_umt.tag_id = owner_tag.id
        JOIN user_media collab_um ON owner_um.media_id = collab_um.media_id
        JOIN user_media_tags collab_umt ON collab_um.id = collab_umt.user_media_id
        JOIN tags collab_tag ON collab_umt.tag_id = collab_tag.id
        WHERE owner_um.user_id = ${collaboration.owner_id}
        AND collab_um.user_id = ${userId}
        AND owner_tag.slug = ANY(string_to_array(${tagListStr}, ','))
        AND collab_tag.slug = ANY(string_to_array(${tagListStr}, ','))
        AND owner_tag.user_id IS NULL
        AND collab_tag.user_id IS NULL
      `;
      duplicatesCount += parseInt(tagDuplicates.rows[0]?.count || '0', 10);
    }
  }

  // Create notification for the inviter
  try {
    const accepterResult = await sql`
      SELECT name FROM users WHERE id = ${userId}
    `;
    const accepterName = accepterResult.rows[0]?.name || 'Someone';

    await createNotification({
      user_id: collaboration.owner_id,
      type: 'collab_accepted',
      title: `${accepterName} accepted your invite`,
      message: `You're now sharing lists together`,
      data: {
        accepter_name: accepterName,
        accepter_id: userId,
        shared_lists: selectedLists,
      },
    });
  } catch (notifError) {
    // Don't fail the invite acceptance if notification fails
    console.error('Failed to create acceptance notification:', notifError);
  }

  return { success: true, duplicatesCount };
}

// Get all collaborations for a user
export async function getUserCollaborations(userId: number): Promise<{
  collaboration: CollaboratorWithUser;
  sharedLists: string[];
  isOwner: boolean;
}[]> {
  const result = await sql`
    SELECT
      c.*,
      owner.name as owner_name,
      owner.email as owner_email,
      collab.name as collaborator_name,
      collab.email as collaborator_email
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
    AND c.status = 'accepted'
    ORDER BY c.accepted_at DESC
  `;

  const collaborations = [];

  for (const row of result.rows) {
    const listsResult = await sql`
      SELECT list_type FROM shared_lists
      WHERE collaborator_id = ${row.id}
      AND is_active = true
    `;

    collaborations.push({
      collaboration: row as CollaboratorWithUser,
      sharedLists: listsResult.rows.map(r => r.list_type),
      isOwner: row.owner_id === userId,
    });
  }

  return collaborations;
}

// Get collaborator IDs for a specific list type
export async function getCollaboratorIds(
  userId: number,
  listType: string
): Promise<number[]> {
  const result = await sql`
    SELECT
      CASE
        WHEN c.owner_id = ${userId} THEN c.collaborator_id
        ELSE c.owner_id
      END as partner_id
    FROM collaborators c
    JOIN shared_lists sl ON sl.collaborator_id = c.id
    WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
    AND c.status = 'accepted'
    AND sl.list_type = ${listType}
    AND sl.is_active = true
  `;

  return result.rows.map(r => r.partner_id).filter(id => id !== null);
}

// Remove a collaboration
export async function removeCollaboration(
  collaborationId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  // Verify user is part of this collaboration and get details
  const result = await sql`
    SELECT c.*,
           owner.name as owner_name,
           collab.name as collaborator_name
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE c.id = ${collaborationId}
    AND (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
  `;

  if (result.rows.length === 0) {
    return { success: false, error: 'Collaboration not found' };
  }

  const collaboration = result.rows[0];

  // Determine who is the other person and who ended it
  const isOwner = collaboration.owner_id === userId;
  const otherUserId = isOwner ? collaboration.collaborator_id : collaboration.owner_id;
  const enderName = isOwner ? collaboration.owner_name : collaboration.collaborator_name;

  // Delete the collaboration (cascades to shared_lists)
  await sql`
    DELETE FROM collaborators
    WHERE id = ${collaborationId}
  `;

  // Notify the other person that the connection was ended
  if (otherUserId) {
    try {
      await createNotification({
        user_id: otherUserId,
        type: 'collab_ended',
        title: `${enderName} ended your connection`,
        message: 'You are no longer sharing lists together',
        data: {
          ender_name: enderName,
          ender_id: userId,
        },
      });
    } catch (notifError) {
      // Don't fail the removal if notification fails
      console.error('Failed to create disconnect notification:', notifError);
    }
  }

  return { success: true };
}

// Update shared lists for a collaboration
export async function updateSharedLists(
  collaborationId: number,
  userId: number,
  lists: string[]
): Promise<{ success: boolean; error?: string }> {
  // Verify user is part of this collaboration
  const result = await sql`
    SELECT * FROM collaborators
    WHERE id = ${collaborationId}
    AND (owner_id = ${userId} OR collaborator_id = ${userId})
    AND status = 'accepted'
  `;

  if (result.rows.length === 0) {
    return { success: false, error: 'Collaboration not found' };
  }

  // Deactivate all lists
  await sql`
    UPDATE shared_lists
    SET is_active = false
    WHERE collaborator_id = ${collaborationId}
  `;

  // Activate selected lists (insert if not exists)
  for (const listType of lists) {
    await sql`
      INSERT INTO shared_lists (collaborator_id, list_type, is_active)
      VALUES (${collaborationId}, ${listType}, true)
      ON CONFLICT (collaborator_id, list_type)
      DO UPDATE SET is_active = true
    `;
  }

  return { success: true };
}

// Check if a user has any active collaborations for a given list type
export async function hasSharedList(userId: number, listType: string): Promise<boolean> {
  const collaboratorIds = await getCollaboratorIds(userId, listType);
  return collaboratorIds.length > 0;
}

// Get all list types that are shared for a user
export async function getSharedListTypes(userId: number): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT sl.list_type
    FROM shared_lists sl
    JOIN collaborators c ON c.id = sl.collaborator_id
    WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
    AND c.status = 'accepted'
    AND sl.is_active = true
  `;
  return result.rows.map(r => r.list_type);
}

// Create a direct invite to a specific user (by their user ID)
export async function createDirectInvite(
  ownerId: number,
  targetUserId: number,
  lists: string[] = [],
  message?: string,
  type: CollaboratorType = 'friend'
): Promise<{ success: boolean; error?: string; inviteId?: number }> {
  // Check if user is trying to invite themselves
  if (ownerId === targetUserId) {
    return { success: false, error: 'Cannot invite yourself' };
  }

  // For partner type, check if user already has a partner
  if (type === 'partner') {
    const existingPartner = await sql`
      SELECT id FROM collaborators
      WHERE (owner_id = ${ownerId} OR collaborator_id = ${ownerId})
      AND type = 'partner'
      AND status = 'accepted'
    `;
    if (existingPartner.rows.length > 0) {
      return { success: false, error: 'You already have a partner. Remove your current partner first.' };
    }
  }

  // Check if collaboration already exists between these users
  const existingResult = await sql`
    SELECT id, status, type FROM collaborators
    WHERE (
      (owner_id = ${ownerId} AND (collaborator_id = ${targetUserId} OR target_user_id = ${targetUserId}))
      OR (owner_id = ${targetUserId} AND collaborator_id = ${ownerId})
    )
  `;

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    if (existing.status === 'accepted') {
      // Allow upgrading friend to partner or inviting as different type
      if (existing.type === type) {
        return { success: false, error: 'You are already connected with this user' };
      }
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'An invite is already pending with this user' };
    }
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for direct invites

  // Create the collaboration record with target_user_id
  const result = await sql`
    INSERT INTO collaborators (owner_id, target_user_id, invite_code, invite_expires_at, invite_message, status, type)
    VALUES (${ownerId}, ${targetUserId}, ${inviteCode}, ${expiresAt.toISOString()}, ${message || null}, 'pending', ${type})
    RETURNING id
  `;

  const collaboratorId = result.rows[0].id;

  // Add the shared lists
  for (const listType of lists) {
    await sql`
      INSERT INTO shared_lists (collaborator_id, list_type)
      VALUES (${collaboratorId}, ${listType})
    `;
  }

  return { success: true, inviteId: collaboratorId };
}

// Get pending direct invites for a user
export async function getPendingDirectInvites(userId: number): Promise<{
  id: number;
  ownerName: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  ownerId: number;
  message: string | null;
  sharedLists: string[];
  createdAt: Date;
  inviteType?: string;
}[]> {
  // Query for invites where user is the target
  // - target_user_id is used by general collaborator invites
  // - collaborator_id is used by friend/partner invites
  const result = await sql`
    SELECT
      c.id,
      c.owner_id,
      c.invite_message,
      c.created_at,
      c.type,
      u.name as owner_name,
      u.username as owner_username,
      u.profile_image as owner_image
    FROM collaborators c
    JOIN users u ON c.owner_id = u.id
    WHERE (c.target_user_id = ${userId} OR c.collaborator_id = ${userId})
    AND c.status = 'pending'
    AND c.invite_expires_at > NOW()
    ORDER BY c.created_at DESC
  `;

  const invites = [];
  for (const row of result.rows) {
    const listsResult = await sql`
      SELECT list_type FROM shared_lists
      WHERE collaborator_id = ${row.id}
    `;

    invites.push({
      id: row.id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerUsername: row.owner_username,
      ownerImage: row.owner_image || null,
      message: row.invite_message,
      sharedLists: listsResult.rows.map(r => r.list_type),
      createdAt: row.created_at,
      inviteType: row.type,
    });
  }

  return invites;
}

// Get count of pending direct invites for a user
export async function getPendingDirectInviteCount(userId: number): Promise<number> {
  const result = await sql`
    SELECT COUNT(*)::int as count
    FROM collaborators
    WHERE (target_user_id = ${userId} OR collaborator_id = ${userId})
    AND status = 'pending'
    AND invite_expires_at > NOW()
  `;
  return result.rows[0]?.count || 0;
}

// Accept a direct invite
export async function acceptDirectInvite(
  inviteId: number,
  userId: number,
  selectedLists: string[]
): Promise<{ success: boolean; error?: string }> {
  console.log(`[acceptDirectInvite] Accepting invite ${inviteId} for user ${userId}`);

  // Verify the invite is for this user and is pending
  // Check both target_user_id (general invites) and collaborator_id (friend/partner invites)
  const result = await sql`
    SELECT * FROM collaborators
    WHERE id = ${inviteId}
    AND (target_user_id = ${userId} OR collaborator_id = ${userId})
    AND status = 'pending'
    AND invite_expires_at > NOW()
  `;

  if (result.rows.length === 0) {
    console.log(`[acceptDirectInvite] Invite not found or expired for inviteId=${inviteId}, userId=${userId}`);
    return { success: false, error: 'Invite not found or expired' };
  }

  const invite = result.rows[0];
  console.log(`[acceptDirectInvite] Found invite:`, {
    id: invite.id,
    owner_id: invite.owner_id,
    collaborator_id: invite.collaborator_id,
    target_user_id: invite.target_user_id,
    type: invite.type,
    status: invite.status
  });

  // Update the collaboration - set collaborator_id if it was a target_user_id invite
  await sql`
    UPDATE collaborators
    SET collaborator_id = ${userId},
        status = 'accepted',
        accepted_at = NOW()
    WHERE id = ${inviteId}
  `;

  console.log(`[acceptDirectInvite] Updated invite ${inviteId} to accepted, collaborator_id=${userId}`);

  // Update shared lists to only include selected ones
  await sql`
    UPDATE shared_lists
    SET is_active = false
    WHERE collaborator_id = ${inviteId}
  `;

  for (const listType of selectedLists) {
    await sql`
      UPDATE shared_lists
      SET is_active = true
      WHERE collaborator_id = ${inviteId}
      AND list_type = ${listType}
    `;
  }

  return { success: true };
}

// Decline a direct invite
export async function declineDirectInvite(
  inviteId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  // Check both target_user_id (general invites) and collaborator_id (friend/partner invites)
  const result = await sql`
    UPDATE collaborators
    SET status = 'declined'
    WHERE id = ${inviteId}
    AND (target_user_id = ${userId} OR collaborator_id = ${userId})
    AND status = 'pending'
    RETURNING id
  `;

  if (result.rows.length === 0) {
    return { success: false, error: 'Invite not found' };
  }

  return { success: true };
}

// Get pending link-based invites created by a user
export async function getPendingLinkInvites(userId: number): Promise<{
  id: number;
  inviteCode: string;
  sharedLists: string[];
  createdAt: Date;
  expiresAt: Date;
}[]> {
  const result = await sql`
    SELECT
      c.id,
      c.invite_code,
      c.created_at,
      c.invite_expires_at
    FROM collaborators c
    WHERE c.owner_id = ${userId}
    AND c.status = 'pending'
    AND c.target_user_id IS NULL
    AND c.invite_expires_at > NOW()
    ORDER BY c.created_at DESC
  `;

  const invites = [];
  for (const row of result.rows) {
    const listsResult = await sql`
      SELECT list_type FROM shared_lists
      WHERE collaborator_id = ${row.id}
    `;

    invites.push({
      id: row.id,
      inviteCode: row.invite_code,
      sharedLists: listsResult.rows.map(r => r.list_type),
      createdAt: row.created_at,
      expiresAt: row.invite_expires_at,
    });
  }

  return invites;
}

// Get pending direct invites sent BY a user (to specific users)
export async function getPendingSentDirectInvites(userId: number): Promise<{
  id: number;
  targetUserId: number;
  targetName: string;
  targetUsername: string | null;
  targetImage: string | null;
  sharedLists: string[];
  createdAt: Date;
  expiresAt: Date;
}[]> {
  const result = await sql`
    SELECT
      c.id,
      c.target_user_id,
      c.created_at,
      c.invite_expires_at,
      u.name as target_name,
      u.username as target_username,
      u.profile_image as target_image
    FROM collaborators c
    JOIN users u ON c.target_user_id = u.id
    WHERE c.owner_id = ${userId}
    AND c.status = 'pending'
    AND c.target_user_id IS NOT NULL
    AND c.invite_expires_at > NOW()
    ORDER BY c.created_at DESC
  `;

  const invites = [];
  for (const row of result.rows) {
    const listsResult = await sql`
      SELECT list_type FROM shared_lists
      WHERE collaborator_id = ${row.id}
    `;

    invites.push({
      id: row.id,
      targetUserId: row.target_user_id,
      targetName: row.target_name,
      targetUsername: row.target_username,
      targetImage: row.target_image,
      sharedLists: listsResult.rows.map(r => r.list_type),
      createdAt: row.created_at,
      expiresAt: row.invite_expires_at,
    });
  }

  return invites;
}

// Revoke a pending invite
export async function revokeInvite(
  inviteId: number,
  userId: number
): Promise<{ success: boolean; error?: string }> {
  const result = await sql`
    UPDATE collaborators
    SET status = 'revoked'
    WHERE id = ${inviteId}
    AND owner_id = ${userId}
    AND status = 'pending'
    RETURNING id
  `;

  if (result.rows.length === 0) {
    return { success: false, error: 'Invite not found or already used' };
  }

  return { success: true };
}

// ============================================================================
// Partner-specific helpers
// ============================================================================

// Check if user already has a partner
export async function hasPartner(userId: number): Promise<boolean> {
  const result = await sql`
    SELECT id FROM collaborators
    WHERE (owner_id = ${userId} OR collaborator_id = ${userId})
    AND type = 'partner'
    AND status = 'accepted'
    LIMIT 1
  `;
  return result.rows.length > 0;
}

// Get user's partner info
export async function getPartner(userId: number): Promise<{
  collaboratorId: number;
  userId: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: Date;
} | null> {
  const result = await sql`
    SELECT
      c.id as collaborator_id,
      c.accepted_at,
      CASE WHEN c.owner_id = ${userId} THEN c.collaborator_id ELSE c.owner_id END as partner_user_id,
      CASE WHEN c.owner_id = ${userId} THEN collab.name ELSE owner.name END as partner_name,
      CASE WHEN c.owner_id = ${userId} THEN collab.username ELSE owner.username END as partner_username,
      CASE WHEN c.owner_id = ${userId} THEN collab.profile_image ELSE owner.profile_image END as partner_image
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
    AND c.type = 'partner'
    AND c.status = 'accepted'
    LIMIT 1
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    collaboratorId: row.collaborator_id,
    userId: row.partner_user_id,
    name: row.partner_name,
    username: row.partner_username,
    image: row.partner_image,
    connectedAt: row.accepted_at,
  };
}

// Get all friends for a user
export async function getFriends(userId: number): Promise<{
  collaboratorId: number;
  userId: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: Date;
}[]> {
  const result = await sql`
    SELECT
      c.id as collaborator_id,
      c.accepted_at,
      CASE WHEN c.owner_id = ${userId} THEN c.collaborator_id ELSE c.owner_id END as friend_user_id,
      CASE WHEN c.owner_id = ${userId} THEN collab.name ELSE owner.name END as friend_name,
      CASE WHEN c.owner_id = ${userId} THEN collab.username ELSE owner.username END as friend_username,
      CASE WHEN c.owner_id = ${userId} THEN collab.profile_image ELSE owner.profile_image END as friend_image
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE (c.owner_id = ${userId} OR c.collaborator_id = ${userId})
    AND c.type = 'friend'
    AND c.status = 'accepted'
    ORDER BY c.accepted_at DESC
  `;

  return result.rows.map(row => ({
    collaboratorId: row.collaborator_id,
    userId: row.friend_user_id,
    name: row.friend_name,
    username: row.friend_username,
    image: row.friend_image,
    connectedAt: row.accepted_at,
  }));
}

// Check if two users are friends
export async function areFriends(userId1: number, userId2: number): Promise<boolean> {
  const result = await sql`
    SELECT id, owner_id, collaborator_id, type, status FROM collaborators
    WHERE (
      (owner_id = ${userId1} AND collaborator_id = ${userId2})
      OR (owner_id = ${userId2} AND collaborator_id = ${userId1})
    )
    AND type = 'friend'
    AND status = 'accepted'
    LIMIT 1
  `;

  const isFriends = result.rows.length > 0;
  console.log(`[areFriends] Checking (${userId1}, ${userId2}): ${isFriends}`, result.rows[0] || 'no match');

  return isFriends;
}
