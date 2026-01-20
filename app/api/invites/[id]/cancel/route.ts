import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cancelInvite } from '@/lib/invites';

// POST /api/invites/[id]/cancel - Cancel a sent invite
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

    if (isNaN(inviteId)) {
      return NextResponse.json({ error: 'Invalid invite ID' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const result = await cancelInvite(userId, inviteId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling invite:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }
}
