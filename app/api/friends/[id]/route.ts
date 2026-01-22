import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { removeFriend, getFriend } from '@/lib/friends';

// GET /api/friends/[id] - Get single friend details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const friendUserId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const friend = await getFriend(userId, friendUserId);

    if (!friend) {
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    return NextResponse.json({ friend });
  } catch (error) {
    console.error('Error getting friend:', error);
    return NextResponse.json({ error: 'Failed to get friend' }, { status: 500 });
  }
}

// DELETE /api/friends/[id] - Remove friend (id is collaborator_id)
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
    const collaboratorId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(collaboratorId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const result = await removeFriend(userId, collaboratorId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 });
  }
}
