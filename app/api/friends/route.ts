import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFriends, createFriendInvite, getFriendStats } from '@/lib/friends';

// GET /api/friends - Get all friends
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const friends = await getFriends(userId);
    const stats = await getFriendStats(userId);

    return NextResponse.json({ friends, stats });
  } catch (error) {
    console.error('Error getting friends:', error);
    return NextResponse.json({ error: 'Failed to get friends' }, { status: 500 });
  }
}

// POST /api/friends - Create friend invite
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const result = await createFriendInvite(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      inviteCode: result.inviteCode,
      expiresAt: result.expiresAt,
      inviteUrl: `${process.env.NEXTAUTH_URL}/invite/${result.inviteCode}?type=friend`,
    });
  } catch (error) {
    console.error('Error creating friend invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
