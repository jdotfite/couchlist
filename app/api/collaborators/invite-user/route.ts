import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { createDirectInvite } from '@/lib/collaborators';

// POST /api/collaborators/invite-user - Send a direct invite to a user by username
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { username, lists, message } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Find the user by username
    const userResult = await sql`
      SELECT id, name, username FROM users
      WHERE LOWER(username) = LOWER(${username})
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = userResult.rows[0];
    const userId = parseInt(session.user.id, 10);

    // Create the direct invite
    const result = await createDirectInvite(
      userId,
      targetUser.id,
      lists || ['watchlist', 'watching', 'finished'],
      message
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      inviteId: result.inviteId,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
      },
    });
  } catch (error) {
    console.error('Error creating direct invite:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
