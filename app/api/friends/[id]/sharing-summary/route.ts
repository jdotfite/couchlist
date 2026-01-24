import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { areFriends } from '@/lib/friends';
import { getListsSharedWithFriend, getListsSharedWithMe } from '@/lib/list-visibility';
import { getListDisplayName } from '@/lib/list-preferences';
import { getCollaborativeList } from '@/lib/collaborative-lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/friends/[id]/sharing-summary - Get mutual sharing status with a friend
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get friend info
    const friendResult = await sql`
      SELECT id, name, username, profile_image as image
      FROM users WHERE id = ${friendUserId}
    `;

    if (friendResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const friend = friendResult.rows[0];

    // Get lists I share with this friend
    const listsIShare = await getListsSharedWithFriend(userId, friendUserId);

    // Debug logging
    console.log(`[sharing-summary] User ${userId} checking friend ${friendUserId}`);
    console.log(`[sharing-summary] Lists I share with friend:`, listsIShare.length);

    // Enhance with my display names
    const youShare = await Promise.all(
      listsIShare.map(async (list) => ({
        ...list,
        listName: await getListDisplayName(userId, list.listType) || list.listType
      }))
    );

    // Get lists they share with me
    const listsTheyShare = await getListsSharedWithMe(userId, friendUserId);

    // Debug logging
    console.log(`[sharing-summary] Lists friend shares with me:`, listsTheyShare.length);

    // Enhance with their display names and item counts
    const theyShare = await Promise.all(
      listsTheyShare.map(async (list) => {
        const displayName = await getListDisplayName(friendUserId, list.listType);

        // Get item count
        let itemCount = 0;
        if (list.listId) {
          const countResult = await sql`
            SELECT COUNT(*)::int as count FROM custom_list_items
            WHERE custom_list_id = ${list.listId}
          `;
          itemCount = countResult.rows[0]?.count || 0;
        } else {
          const status = ['favorites', 'rewatch', 'nostalgia'].includes(list.listType)
            ? null
            : list.listType;

          if (status) {
            const countResult = await sql`
              SELECT COUNT(*)::int as count FROM user_media
              WHERE user_id = ${friendUserId} AND status = ${status}
            `;
            itemCount = countResult.rows[0]?.count || 0;
          } else {
            const countResult = await sql`
              SELECT COUNT(*)::int as count
              FROM user_media_tags umt
              JOIN tags t ON t.id = umt.tag_id
              JOIN user_media um ON um.id = umt.user_media_id
              WHERE um.user_id = ${friendUserId} AND t.slug = ${list.listType}
            `;
            itemCount = countResult.rows[0]?.count || 0;
          }
        }

        return {
          listType: list.listType,
          listId: list.listId,
          listName: displayName || list.listType,
          visibility: list.visibility,
          canEdit: false, // They don't give me edit access info in this direction
          itemCount
        };
      })
    );

    // Get collaborative list if one exists
    const collaborativeList = await getCollaborativeList(userId, friendUserId);

    return NextResponse.json({
      friend: {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        image: friend.image
      },
      youShare,
      theyShare,
      youShareCount: youShare.length,
      theyShareCount: theyShare.length,
      collaborativeList
    });
  } catch (error) {
    console.error('Error getting sharing summary:', error);
    return NextResponse.json(
      { error: 'Failed to get sharing summary' },
      { status: 500 }
    );
  }
}
