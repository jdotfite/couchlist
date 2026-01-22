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

    // Get pending friend invites created by this user (link invites without specific target)
    const { rows } = await sql`
      SELECT
        id,
        invite_code,
        invite_expires_at,
        created_at
      FROM collaborators
      WHERE owner_id = ${userId}
        AND type = 'friend'
        AND status = 'pending'
        AND collaborator_id IS NULL
        AND invite_expires_at > NOW()
      ORDER BY created_at DESC
    `;

    const invites = rows.map(row => ({
      id: row.id,
      inviteCode: row.invite_code,
      inviteUrl: `${process.env.NEXTAUTH_URL}/invite/${row.invite_code}?type=friend`,
      createdAt: row.created_at,
      expiresAt: row.invite_expires_at,
    }));

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error getting pending friend invites:', error);
    return NextResponse.json({ error: 'Failed to get pending invites' }, { status: 500 });
  }
}
