import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { areFriends } from '@/lib/friends';
import {
  grantFriendAccess,
  revokeFriendAccess,
  setListVisibility,
  getListVisibility
} from '@/lib/list-visibility';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ListToShare {
  listType: string;
  listId?: number | null;
  canEdit?: boolean;
}

interface UpdateSharingRequest {
  listsToShare: ListToShare[];
  listsToRemove: string[];
}

// PATCH /api/friends/[id]/sharing - Batch update sharing with a friend
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    // Verify friendship
    if (!(await areFriends(userId, friendUserId))) {
      return NextResponse.json(
        { error: 'Not friends with this user' },
        { status: 403 }
      );
    }

    const body: UpdateSharingRequest = await request.json();
    const { listsToShare = [], listsToRemove = [] } = body;

    console.log(`[sharing PATCH] User ${userId} sharing with friend ${friendUserId}`);
    console.log(`[sharing PATCH] Lists to share:`, listsToShare);
    console.log(`[sharing PATCH] Lists to remove:`, listsToRemove);

    // Process lists to share
    for (const list of listsToShare) {
      const listId = list.listId ?? null;
      const canEdit = list.canEdit ?? false;

      // Grant friend access
      try {
        await grantFriendAccess(userId, friendUserId, list.listType, listId, canEdit);
      } catch (grantError) {
        console.error(`Failed to grant access for ${list.listType}:`, grantError);
        return NextResponse.json(
          { error: `Failed to grant access: ${grantError instanceof Error ? grantError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }

      // Ensure visibility is set to at least 'select_friends' if currently 'private'
      const currentVisibility = await getListVisibility(userId, list.listType, listId);
      if (currentVisibility === 'private') {
        await setListVisibility(userId, list.listType, 'select_friends', listId);
      }
    }

    // Process lists to remove
    for (const listType of listsToRemove) {
      await revokeFriendAccess(userId, friendUserId, listType, null);
    }

    return NextResponse.json({
      success: true,
      shared: listsToShare.length,
      removed: listsToRemove.length
    });
  } catch (error) {
    console.error('Error updating friend sharing:', error);
    return NextResponse.json(
      { error: 'Failed to update sharing' },
      { status: 500 }
    );
  }
}
