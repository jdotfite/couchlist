import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { areFriends } from '@/lib/friends';
import {
  grantFriendAccessMultiple,
  revokeAllFriendAccess,
  SYSTEM_LIST_TYPES
} from '@/lib/list-visibility';
import { getListDisplayName } from '@/lib/list-preferences';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/friends/[id]/shared - Get lists you're sharing with a specific friend
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

    // Get lists I'm sharing with this friend (from friend_list_access)
    const accessResult = await sql`
      SELECT list_type, list_id, can_edit, granted_at
      FROM friend_list_access
      WHERE owner_id = ${userId} AND friend_id = ${friendUserId}
      ORDER BY granted_at DESC
    `;

    // Enhance with display names and item counts
    const sharedLists = await Promise.all(
      accessResult.rows.map(async (row) => {
        const displayName = await getListDisplayName(userId, row.list_type);

        // Get item count
        let itemCount = 0;
        if (row.list_id) {
          const countResult = await sql`
            SELECT COUNT(*)::int as count FROM custom_list_items
            WHERE custom_list_id = ${row.list_id}
          `;
          itemCount = countResult.rows[0]?.count || 0;
        } else {
          const status = row.list_type === 'favorites' || row.list_type === 'rewatch' || row.list_type === 'nostalgia'
            ? null
            : row.list_type;

          if (status) {
            const countResult = await sql`
              SELECT COUNT(*)::int as count FROM user_media
              WHERE user_id = ${userId} AND status = ${status}
            `;
            itemCount = countResult.rows[0]?.count || 0;
          } else {
            const tagSlug = row.list_type;
            const countResult = await sql`
              SELECT COUNT(*)::int as count
              FROM user_media_tags umt
              JOIN tags t ON t.id = umt.tag_id
              JOIN user_media um ON um.id = umt.user_media_id
              WHERE um.user_id = ${userId} AND t.slug = ${tagSlug}
            `;
            itemCount = countResult.rows[0]?.count || 0;
          }
        }

        return {
          listType: row.list_type,
          listId: row.list_id,
          listName: displayName || row.list_type,
          canEdit: row.can_edit,
          itemCount,
          grantedAt: row.granted_at
        };
      })
    );

    // Also get all available system lists for the UI to show what can be shared
    const availableLists = await Promise.all(
      SYSTEM_LIST_TYPES.map(async (listType) => {
        const displayName = await getListDisplayName(userId, listType);
        const isShared = sharedLists.some(s => s.listType === listType && s.listId === null);

        // Get item count - only core status lists now
        const countResult = await sql`
          SELECT COUNT(*)::int as count FROM user_media
          WHERE user_id = ${userId} AND status = ${listType}
        `;
        const itemCount = countResult.rows[0]?.count || 0;

        return {
          listType,
          listId: null,
          listName: displayName || listType,
          isShared,
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
      sharedLists,
      availableLists
    });
  } catch (error) {
    console.error('Error getting shared lists:', error);
    return NextResponse.json(
      { error: 'Failed to get shared lists' },
      { status: 500 }
    );
  }
}

// PATCH /api/friends/[id]/shared - Update which lists you're sharing with a friend
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);
    const body = await request.json();

    // Verify friendship
    if (!(await areFriends(userId, friendUserId))) {
      return NextResponse.json(
        { error: 'Not friends with this user' },
        { status: 403 }
      );
    }

    if (!body.lists || !Array.isArray(body.lists)) {
      return NextResponse.json(
        { error: 'lists array is required' },
        { status: 400 }
      );
    }

    // Clear existing access and set new
    await revokeAllFriendAccess(userId, friendUserId);

    // Grant access to specified lists
    if (body.lists.length > 0) {
      await grantFriendAccessMultiple(userId, friendUserId, body.lists);
    }

    // Get updated shared lists
    const accessResult = await sql`
      SELECT list_type, list_id, can_edit, granted_at
      FROM friend_list_access
      WHERE owner_id = ${userId} AND friend_id = ${friendUserId}
      ORDER BY granted_at DESC
    `;

    const sharedLists = await Promise.all(
      accessResult.rows.map(async (row) => {
        const displayName = await getListDisplayName(userId, row.list_type);
        return {
          listType: row.list_type,
          listId: row.list_id,
          listName: displayName || row.list_type,
          canEdit: row.can_edit,
          grantedAt: row.granted_at
        };
      })
    );

    return NextResponse.json({
      success: true,
      sharedLists,
      sharedCount: sharedLists.length
    });
  } catch (error: any) {
    console.error('Error updating shared lists:', error);
    if (error.message === 'Users are not friends') {
      return NextResponse.json(
        { error: 'Users are not friends' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update shared lists' },
      { status: 500 }
    );
  }
}
