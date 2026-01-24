import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFriendsWhoShareLists } from '@/lib/list-visibility';

// GET /api/friends/sharing - Get friends who have shared at least one list with you
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const friends = await getFriendsWhoShareLists(userId);

    return NextResponse.json({
      friends,
      totalCount: friends.length
    });
  } catch (error) {
    console.error('Error getting friends who share lists:', error);
    return NextResponse.json(
      { error: 'Failed to get friends' },
      { status: 500 }
    );
  }
}
