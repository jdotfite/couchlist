import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getListVisibility,
  setListVisibility,
  getListFriends,
  type VisibilityLevel
} from '@/lib/list-visibility';

interface RouteParams {
  params: Promise<{ listType: string }>;
}

// GET /api/list-visibility/[listType] - Get visibility for a specific list
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { listType } = await params;
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const parsedListId = listId ? parseInt(listId) : null;

    const visibility = await getListVisibility(userId, listType, parsedListId);
    const friends = await getListFriends(userId, listType, parsedListId);

    return NextResponse.json({
      listType,
      listId: parsedListId,
      visibility,
      friends,
      friendCount: friends.length
    });
  } catch (error) {
    console.error('Error getting list visibility:', error);
    return NextResponse.json(
      { error: 'Failed to get visibility' },
      { status: 500 }
    );
  }
}

// PATCH /api/list-visibility/[listType] - Update visibility for a specific list
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { listType } = await params;
    const body = await request.json();

    const validVisibilities: VisibilityLevel[] = ['private', 'select_friends', 'friends', 'public'];
    if (!validVisibilities.includes(body.visibility)) {
      return NextResponse.json(
        { error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` },
        { status: 400 }
      );
    }

    const listId = body.listId !== undefined ? body.listId : null;

    await setListVisibility(userId, listType, body.visibility, listId);

    const visibility = await getListVisibility(userId, listType, listId);
    const friends = await getListFriends(userId, listType, listId);

    return NextResponse.json({
      success: true,
      listType,
      listId,
      visibility,
      friends,
      friendCount: friends.length
    });
  } catch (error) {
    console.error('Error updating list visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update visibility' },
      { status: 500 }
    );
  }
}
