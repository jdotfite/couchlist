import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  removeFromCollaborativeList,
  markCollaborativeItemWatched
} from '@/lib/collaborative-lists';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// DELETE /api/friends/[id]/collaborative-list/items/[itemId] - Remove item from list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id, itemId } = await params;
    const friendUserId = parseInt(id);
    const itemIdNum = parseInt(itemId);

    if (isNaN(friendUserId) || isNaN(itemIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const result = await removeFromCollaborativeList(userId, friendUserId, itemIdNum);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item:', error);
    return NextResponse.json(
      { error: 'Failed to remove item' },
      { status: 500 }
    );
  }
}

// POST /api/friends/[id]/collaborative-list/items/[itemId] - Mark as watched
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id, itemId } = await params;
    const friendUserId = parseInt(id);
    const itemIdNum = parseInt(itemId);

    if (isNaN(friendUserId) || isNaN(itemIdNum)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const body = await request.json();
    const { moveToFinished, rating, watchedNote } = body;

    const result = await markCollaborativeItemWatched(
      userId,
      friendUserId,
      itemIdNum,
      {
        moveToFinished: moveToFinished !== false, // Default to true
        rating,
        watchedNote
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking as watched:', error);
    return NextResponse.json(
      { error: 'Failed to mark as watched' },
      { status: 500 }
    );
  }
}
