import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getListFriends,
  grantFriendAccess,
  grantFriendAccessMultiple,
  revokeFriendAccess,
  setListVisibility,
  getListVisibility
} from '@/lib/list-visibility';

interface RouteParams {
  params: Promise<{ listType: string }>;
}

// GET /api/list-visibility/[listType]/friends - Get friends with access to this list
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

    const friends = await getListFriends(userId, listType, parsedListId);

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Error getting list friends:', error);
    return NextResponse.json(
      { error: 'Failed to get friends with access' },
      { status: 500 }
    );
  }
}

// POST /api/list-visibility/[listType]/friends - Grant friend(s) access to this list
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { listType } = await params;
    const body = await request.json();

    const listId = body.listId !== undefined ? body.listId : null;
    const canEdit = body.canEdit === true;

    // Support single friendId or array of friendIds
    if (body.friendId) {
      await grantFriendAccess(userId, body.friendId, listType, listId, canEdit);
    } else if (body.friendIds && Array.isArray(body.friendIds)) {
      for (const friendId of body.friendIds) {
        await grantFriendAccess(userId, friendId, listType, listId, canEdit);
      }
    } else {
      return NextResponse.json(
        { error: 'friendId or friendIds array is required' },
        { status: 400 }
      );
    }

    // Auto-set visibility to 'select_friends' if currently 'private'
    const currentVisibility = await getListVisibility(userId, listType, listId);
    if (currentVisibility === 'private') {
      await setListVisibility(userId, listType, 'select_friends', listId);
    }

    const friends = await getListFriends(userId, listType, listId);
    const visibility = await getListVisibility(userId, listType, listId);

    return NextResponse.json({
      success: true,
      visibility,
      friends,
      friendCount: friends.length
    });
  } catch (error: any) {
    console.error('Error granting friend access:', error);
    if (error.message === 'Users are not friends') {
      return NextResponse.json(
        { error: 'You can only grant access to friends' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to grant access' },
      { status: 500 }
    );
  }
}

// DELETE /api/list-visibility/[listType]/friends - Revoke friend's access to this list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { listType } = await params;
    const { searchParams } = new URL(request.url);

    const friendId = searchParams.get('friendId');
    const listId = searchParams.get('listId');
    const parsedListId = listId ? parseInt(listId) : null;

    if (!friendId) {
      return NextResponse.json(
        { error: 'friendId is required' },
        { status: 400 }
      );
    }

    await revokeFriendAccess(userId, parseInt(friendId), listType, parsedListId);

    const friends = await getListFriends(userId, listType, parsedListId);

    return NextResponse.json({
      success: true,
      friends,
      friendCount: friends.length
    });
  } catch (error) {
    console.error('Error revoking friend access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke access' },
      { status: 500 }
    );
  }
}
