import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { declineDirectInvite } from '@/lib/collaborators';

// POST /api/collaborators/direct-invites/[id]/decline - Decline a direct invite
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

    const result = await declineDirectInvite(inviteId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining direct invite:', error);
    return NextResponse.json({ error: 'Failed to decline invite' }, { status: 500 });
  }
}
