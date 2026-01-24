import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// GET /api/friends/incoming-invites - Get pending friend invites sent TO this user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get pending friend invites where this user is the target (collaborator_id)
    const { rows } = await sql`
      SELECT
        c.id,
        c.invite_code,
        c.created_at,
        c.invite_expires_at,
        c.owner_id,
        u.name as sender_name,
        u.username as sender_username,
        u.image as sender_image
      FROM collaborators c
      JOIN users u ON c.owner_id = u.id
      WHERE c.collaborator_id = ${userId}
        AND c.type = 'friend'
        AND c.status = 'pending'
        AND c.invite_expires_at > NOW()
      ORDER BY c.created_at DESC
    `;

    const invites = rows.map(row => ({
      id: row.id,
      inviteCode: row.invite_code,
      createdAt: row.created_at,
      expiresAt: row.invite_expires_at,
      sender: {
        id: row.owner_id,
        name: row.sender_name,
        username: row.sender_username,
        image: row.sender_image,
      },
    }));

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error getting incoming friend invites:', error);
    return NextResponse.json({ error: 'Failed to get incoming invites' }, { status: 500 });
  }
}
