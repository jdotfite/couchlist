import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserCollaborativeLists } from '@/lib/collaborative-lists';

// GET /api/collaborative-lists - Get all collaborative lists for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const lists = await getUserCollaborativeLists(userId);

    return NextResponse.json({
      lists: lists.map(list => ({
        id: list.id,
        name: list.name,
        itemCount: list.itemCount,
        createdAt: list.createdAt,
        friendUserId: list.friendUserId,
        friendName: list.friendName,
        friendImage: list.friendImage,
      }))
    });
  } catch (error) {
    console.error('Error fetching collaborative lists:', error);
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}
