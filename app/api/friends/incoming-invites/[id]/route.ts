import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { createNotification } from '@/lib/show-alerts';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/friends/incoming-invites/[id] - Accept an incoming friend invite
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const inviteId = parseInt(id);

    // Verify this invite exists and is for this user
    const inviteResult = await sql`
      SELECT c.*, u.name as owner_name
      FROM collaborators c
      JOIN users u ON c.owner_id = u.id
      WHERE c.id = ${inviteId}
        AND c.collaborator_id = ${userId}
        AND c.type = 'friend'
        AND c.status = 'pending'
    `;

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invite not found or already processed' }, { status: 404 });
    }

    const invite = inviteResult.rows[0];

    // Check if expired
    if (new Date(invite.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }

    // Accept the invite
    await sql`
      UPDATE collaborators
      SET status = 'accepted',
          accepted_at = NOW()
      WHERE id = ${inviteId}
    `;

    // Notify the inviter
    const acceptorResult = await sql`
      SELECT name FROM users WHERE id = ${userId}
    `;
    const acceptorName = acceptorResult.rows[0]?.name || 'Someone';

    await createNotification({
      user_id: invite.owner_id,
      type: 'collab_accepted',
      title: `${acceptorName} is now your friend!`,
      message: 'You can now suggest titles to each other',
      data: {
        accepter_name: acceptorName,
        accepter_id: userId,
      },
    });

    return NextResponse.json({
      success: true,
      friendUserId: invite.owner_id,
      friendName: invite.owner_name,
    });
  } catch (error) {
    console.error('Error accepting friend invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}

// DELETE /api/friends/incoming-invites/[id] - Decline an incoming friend invite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const inviteId = parseInt(id);

    // Verify this invite exists and is for this user
    const inviteResult = await sql`
      SELECT * FROM collaborators
      WHERE id = ${inviteId}
        AND collaborator_id = ${userId}
        AND type = 'friend'
        AND status = 'pending'
    `;

    if (inviteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Delete the invite (decline)
    await sql`DELETE FROM collaborators WHERE id = ${inviteId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining friend invite:', error);
    return NextResponse.json({ error: 'Failed to decline invite' }, { status: 500 });
  }
}
