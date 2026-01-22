import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// DELETE /api/partners/pending-invites/[id] - Revoke pending partner invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const inviteId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(inviteId)) {
      return NextResponse.json({ error: 'Invalid invite ID' }, { status: 400 });
    }

    // Delete the pending invite (only if owned by user and still pending)
    const { rowCount } = await sql`
      DELETE FROM collaborators
      WHERE id = ${inviteId}
        AND owner_id = ${userId}
        AND type = 'partner'
        AND status = 'pending'
    `;

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking partner invite:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
