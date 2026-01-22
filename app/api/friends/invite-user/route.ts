import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { areFriends } from '@/lib/collaborators';
import { randomBytes } from 'crypto';

// POST /api/friends/invite-user - Send direct friend invite to a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const targetId = parseInt(targetUserId);

    if (targetId === userId) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Check if already friends
    if (await areFriends(userId, targetId)) {
      return NextResponse.json({ error: 'You are already friends with this user' }, { status: 400 });
    }

    // Check if there's already a pending invite between these users
    const { rows: existing } = await sql`
      SELECT id FROM collaborators
      WHERE type = 'friend'
        AND status = 'pending'
        AND (
          (owner_id = ${userId} AND collaborator_id = ${targetId})
          OR (owner_id = ${targetId} AND collaborator_id = ${userId})
        )
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'A friend invite is already pending' }, { status: 400 });
    }

    // Generate invite code
    const inviteCode = randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create the direct invite
    await sql`
      INSERT INTO collaborators (owner_id, collaborator_id, type, invite_code, invite_expires_at, status)
      VALUES (${userId}, ${targetId}, 'friend', ${inviteCode}, ${expiresAt.toISOString()}, 'pending')
    `;

    // Create notification for target user
    const { rows: inviterData } = await sql`
      SELECT name FROM users WHERE id = ${userId}
    `;
    const inviterName = inviterData[0]?.name || 'Someone';

    await sql`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        ${targetId},
        'collab_invite',
        'Friend Request',
        ${`${inviterName} wants to be friends`},
        ${JSON.stringify({
          invite_code: inviteCode,
          invite_type: 'friend',
          inviter_id: userId,
          inviter_name: inviterName,
        })}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending direct friend invite:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
