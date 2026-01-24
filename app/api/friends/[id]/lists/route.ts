import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { areFriends } from '@/lib/friends';
import { getListsSharedWithMe } from '@/lib/list-visibility';
import { getListDisplayName } from '@/lib/list-preferences';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/friends/[id]/lists - Get lists a friend has shared with you
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    // Verify friendship
    if (!(await areFriends(userId, friendUserId))) {
      return NextResponse.json(
        { error: 'Not friends with this user' },
        { status: 403 }
      );
    }

    // Get friend's info
    const friendResult = await sql`
      SELECT id, name, username, profile_image as image
      FROM users WHERE id = ${friendUserId}
    `;

    if (friendResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const friend = friendResult.rows[0];

    // Get lists they've shared with me
    const sharedLists = await getListsSharedWithMe(userId, friendUserId);

    // Enhance with display names and item counts
    const enhancedLists = await Promise.all(
      sharedLists.map(async (list) => {
        // Get display name from the friend's preferences
        const displayName = await getListDisplayName(friendUserId, list.listType);

        // Get item count for this list
        let itemCount = 0;
        if (list.listId) {
          // Custom list
          const countResult = await sql`
            SELECT COUNT(*)::int as count FROM custom_list_items
            WHERE custom_list_id = ${list.listId}
          `;
          itemCount = countResult.rows[0]?.count || 0;
        } else {
          // System list - count from user_media
          const status = list.listType === 'favorites' || list.listType === 'rewatch' || list.listType === 'nostalgia'
            ? null // These are tags, not statuses
            : list.listType;

          if (status) {
            const countResult = await sql`
              SELECT COUNT(*)::int as count FROM user_media
              WHERE user_id = ${friendUserId} AND status = ${status}
            `;
            itemCount = countResult.rows[0]?.count || 0;
          } else {
            // It's a tag - count via user_media_tags
            const tagSlug = list.listType;
            const countResult = await sql`
              SELECT COUNT(*)::int as count
              FROM user_media_tags umt
              JOIN tags t ON t.id = umt.tag_id
              JOIN user_media um ON um.id = umt.user_media_id
              WHERE um.user_id = ${friendUserId} AND t.slug = ${tagSlug}
            `;
            itemCount = countResult.rows[0]?.count || 0;
          }
        }

        return {
          listType: list.listType,
          listId: list.listId,
          listName: displayName || list.listType,
          visibility: list.visibility,
          itemCount
        };
      })
    );

    return NextResponse.json({
      friend: {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        image: friend.image
      },
      lists: enhancedLists
    });
  } catch (error) {
    console.error('Error getting friend lists:', error);
    return NextResponse.json(
      { error: 'Failed to get friend lists' },
      { status: 500 }
    );
  }
}
