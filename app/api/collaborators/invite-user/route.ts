import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { createDirectInvite } from '@/lib/collaborators';

// POST /api/collaborators/invite-user - Send a direct invite to a user
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { username, targetUserId, lists, message } = body;

    if (!username && !targetUserId) {
      return NextResponse.json({ error: 'Username or targetUserId is required' }, { status: 400 });
    }

    let targetUser;

    if (targetUserId) {
      // Find by ID
      const userResult = await sql`
        SELECT id, name, username FROM users
        WHERE id = ${targetUserId}
      `;
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetUser = userResult.rows[0];
    } else {
      // Find by username
      const userResult = await sql`
        SELECT id, name, username FROM users
        WHERE LOWER(username) = LOWER(${username})
      `;
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetUser = userResult.rows[0];
    }

    const userId = parseInt(session.user.id, 10);

    // Create the direct invite for system lists
    const result = await createDirectInvite(
      userId,
      targetUser.id,
      lists || [],
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
