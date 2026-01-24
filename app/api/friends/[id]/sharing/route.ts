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
  console.log('[sharing PATCH] ========== REQUEST RECEIVED ==========');

  try {
    const session = await auth();
    console.log('[sharing PATCH] Session user id:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('[sharing PATCH] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    console.log('[sharing PATCH] userId (from session):', userId);
    console.log('[sharing PATCH] friendUserId (from URL):', friendUserId);

    if (isNaN(friendUserId)) {
      console.log('[sharing PATCH] Invalid friend ID - NaN');
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    // Verify friendship
    console.log(`[sharing PATCH] Checking areFriends(${userId}, ${friendUserId})...`);
    const friendshipCheck = await areFriends(userId, friendUserId);
    console.log(`[sharing PATCH] areFriends result: ${friendshipCheck}`);

    if (!friendshipCheck) {
      console.log('[sharing PATCH] REJECTED - Not friends');
      return NextResponse.json(
        { error: 'Not friends with this user' },
        { status: 403 }
      );
    }

    // Parse request body
    let body: UpdateSharingRequest;
    try {
      body = await request.json();
      console.log('[sharing PATCH] Request body:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[sharing PATCH] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { listsToShare = [], listsToRemove = [] } = body;

    console.log(`[sharing PATCH] User ${userId} sharing with friend ${friendUserId}`);
    console.log(`[sharing PATCH] Lists to share:`, listsToShare);
    console.log(`[sharing PATCH] Lists to remove:`, listsToRemove);

    // Process lists to share
    for (const list of listsToShare) {
      const listId = list.listId ?? null;
      const canEdit = list.canEdit ?? false;

      console.log(`[sharing PATCH] Processing list: ${list.listType}, listId: ${listId}, canEdit: ${canEdit}`);

      // Grant friend access
      try {
        console.log(`[sharing PATCH] Calling grantFriendAccess(${userId}, ${friendUserId}, ${list.listType}, ${listId}, ${canEdit})`);
        await grantFriendAccess(userId, friendUserId, list.listType, listId, canEdit);
        console.log(`[sharing PATCH] grantFriendAccess succeeded for ${list.listType}`);
      } catch (grantError) {
        console.error(`[sharing PATCH] Failed to grant access for ${list.listType}:`, grantError);
        return NextResponse.json(
          { error: `Failed to grant access: ${grantError instanceof Error ? grantError.message : 'Unknown error'}` },
          { status: 400 }
        );
      }

      // Ensure visibility is set to at least 'select_friends' if currently 'private'
      try {
        const currentVisibility = await getListVisibility(userId, list.listType, listId);
        console.log(`[sharing PATCH] Current visibility for ${list.listType}: ${currentVisibility}`);
        if (currentVisibility === 'private') {
          console.log(`[sharing PATCH] Setting visibility to select_friends for ${list.listType}`);
          await setListVisibility(userId, list.listType, 'select_friends', listId);
          console.log(`[sharing PATCH] setListVisibility succeeded for ${list.listType}`);
        }
      } catch (visError) {
        console.error(`[sharing PATCH] Failed to set visibility for ${list.listType}:`, visError);
        // Continue - access was granted, visibility is secondary
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
