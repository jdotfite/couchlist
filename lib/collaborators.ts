import { sql } from '@vercel/postgres';
import crypto from 'crypto';

// Types
export interface Collaborator {
  id: number;
  owner_id: number;
  collaborator_id: number | null;
  invite_code: string;
  invite_expires_at: Date;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  created_at: Date;
  accepted_at: Date | null;
}

export interface CollaboratorWithUser extends Collaborator {
  owner_name: string;
  owner_email: string;
  collaborator_name: string | null;
  collaborator_email: string | null;
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
  lists: string[] = ['watchlist', 'watching', 'finished']
): Promise<{ inviteCode: string; expiresAt: Date }> {
  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Create the collaboration record
  const result = await sql`
    INSERT INTO collaborators (owner_id, invite_code, invite_expires_at, status)
    VALUES (${ownerId}, ${inviteCode}, ${expiresAt.toISOString()}, 'pending')
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

  return { inviteCode, expiresAt };
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
): Promise<{ success: boolean; error?: string }> {
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

  // If merging items, we need to handle potential duplicates
  // For now, items remain with their original owner but will be visible to both
  // The added_by field tracks who originally added each item

  return { success: true };
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
  // Verify user is part of this collaboration
  const result = await sql`
    SELECT * FROM collaborators
    WHERE id = ${collaborationId}
    AND (owner_id = ${userId} OR collaborator_id = ${userId})
  `;

  if (result.rows.length === 0) {
    return { success: false, error: 'Collaboration not found' };
  }

  // Delete the collaboration (cascades to shared_lists)
  await sql`
    DELETE FROM collaborators
    WHERE id = ${collaborationId}
  `;

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
