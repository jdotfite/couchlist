import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptFriendInvite } from '@/lib/friends';

// POST /api/friends/accept/[code] - Accept friend invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const userId = parseInt(session.user.id);

    const result = await acceptFriendInvite(code, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting friend invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
