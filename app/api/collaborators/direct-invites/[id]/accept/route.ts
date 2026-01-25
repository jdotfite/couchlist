import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { acceptDirectInvite } from '@/lib/collaborators';

// POST /api/collaborators/direct-invites/[id]/accept - Accept a direct invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const inviteId = parseInt(id, 10);
    const userId = parseInt(session.user.id, 10);

    // Get selected lists from request body (optional)
    let selectedLists = ['watchlist', 'watching', 'finished']; // defaults
    try {
      const body = await request.json();
      if (body.lists && Array.isArray(body.lists)) {
        selectedLists = body.lists;
      }
    } catch {
      // No body, use defaults
    }

    const result = await acceptDirectInvite(inviteId, userId, selectedLists);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get the invite owner to clear the notification
    const inviteResult = await sql`
      SELECT owner_id FROM collaborators WHERE id = ${inviteId}
    `;

    if (inviteResult.rows.length > 0) {
      const ownerId = inviteResult.rows[0].owner_id;

      // Clear the friend invite notification for the acceptor
      await sql`
        DELETE FROM notifications
        WHERE user_id = ${userId}
          AND type = 'collab_invite'
          AND (data->>'inviter_id')::int = ${ownerId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting direct invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
