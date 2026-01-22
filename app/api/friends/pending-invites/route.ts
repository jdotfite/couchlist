import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// GET /api/friends/pending-invites - Get pending friend invites
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get pending friend invites created by this user (both link-based and direct)
    const { rows } = await sql`
      SELECT
        c.id,
        c.invite_code,
        c.invite_expires_at,
        c.created_at,
        c.collaborator_id,
        u.name as target_name,
        u.username as target_username
      FROM collaborators c
      LEFT JOIN users u ON c.collaborator_id = u.id
      WHERE c.owner_id = ${userId}
        AND c.type = 'friend'
        AND c.status = 'pending'
        AND c.invite_expires_at > NOW()
      ORDER BY c.created_at DESC
    `;

    const invites = rows.map(row => ({
      id: row.id,
      inviteCode: row.invite_code,
      inviteUrl: `${process.env.NEXTAUTH_URL}/invite/${row.invite_code}?type=friend`,
      createdAt: row.created_at,
      expiresAt: row.invite_expires_at,
      targetUser: row.collaborator_id ? {
        id: row.collaborator_id,
        name: row.target_name,
        username: row.target_username,
      } : null,
    }));

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error getting pending friend invites:', error);
    return NextResponse.json({ error: 'Failed to get pending invites' }, { status: 500 });
  }
}
