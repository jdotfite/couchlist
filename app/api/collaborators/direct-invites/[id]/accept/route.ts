import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { acceptDirectInvite } from '@/lib/collaborators';
import { grantFriendAccess, setListVisibility, getListVisibility } from '@/lib/list-visibility';

// POST /api/collaborators/direct-invites/[id]/accept - Accept a direct invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const inviteId = parseInt(id, 10);
    const userId = parseInt(session.user.id, 10);

    // Get selected lists and collaborative list flag from request body
    let selectedLists: string[] = [];
    let createCollaborativeList = false;
    try {
      const body = await request.json();
      if (body.lists && Array.isArray(body.lists)) {
        selectedLists = body.lists;
      }
      if (body.createCollaborativeList) {
        createCollaborativeList = body.createCollaborativeList;
      }
    } catch {
      // No body, no lists to share
    }

    // First, get the invite to know who the friend (owner) is
    const inviteCheck = await sql`
      SELECT owner_id, type FROM collaborators WHERE id = ${inviteId} AND status = 'pending'
    `;

    if (inviteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const ownerId = inviteCheck.rows[0].owner_id;
    const inviteType = inviteCheck.rows[0].type;

    // Accept the invite (this sets status to 'accepted')
    const result = await acceptDirectInvite(inviteId, userId, selectedLists);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // For friend invites, set up sharing using the new friend_list_access system
    if (inviteType === 'friend' && selectedLists.length > 0) {
      console.log(`[direct-invites/accept] Setting up friend sharing for lists:`, selectedLists);
      console.log(`[direct-invites/accept] userId (acceptor):`, userId, `ownerId (sender):`, ownerId);

      for (const listType of selectedLists) {
        try {
          console.log(`[direct-invites/accept] Granting access: userId=${userId} shares ${listType} with ownerId=${ownerId}`);
          // Grant friend access (acceptor shares their list with the inviter)
          await grantFriendAccess(userId, ownerId, listType, null, false);
          console.log(`[direct-invites/accept] Successfully granted access for ${listType}`);

          // Set visibility to select_friends if currently private
          const currentVisibility = await getListVisibility(userId, listType, null);
          console.log(`[direct-invites/accept] Current visibility for ${listType}: ${currentVisibility}`);
          if (currentVisibility === 'private') {
            await setListVisibility(userId, listType, 'select_friends', null);
            console.log(`[direct-invites/accept] Set visibility to select_friends for ${listType}`);
          }
        } catch (shareError) {
          console.error(`[direct-invites/accept] Failed to share ${listType}:`, shareError);
          // Continue with other lists
        }
      }
      console.log(`[direct-invites/accept] Finished setting up sharing`);
    }

    // Clear the friend invite notification for the acceptor
    await sql`
      DELETE FROM notifications
      WHERE user_id = ${userId}
        AND type = 'collab_invite'
        AND (data->>'inviter_id')::int = ${ownerId}
    `;

    return NextResponse.json({
      success: true,
      friendUserId: ownerId,
      createCollaborativeList
    });
  } catch (error) {
    console.error('Error accepting direct invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
