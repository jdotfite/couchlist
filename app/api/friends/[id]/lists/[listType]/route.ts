import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { areFriends } from '@/lib/friends';
import { canViewList } from '@/lib/list-visibility';
import { getListDisplayName } from '@/lib/list-preferences';

interface RouteParams {
  params: Promise<{ id: string; listType: string }>;
}

// GET /api/friends/[id]/lists/[listType] - Get items in a friend's list
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id, listType } = await params;
    const friendUserId = parseInt(id);

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');
    const parsedListId = listId ? parseInt(listId) : null;

    // Verify friendship
    if (!(await areFriends(userId, friendUserId))) {
      return NextResponse.json(
        { error: 'Not friends with this user' },
        { status: 403 }
      );
    }

    // Check if user has access to this list
    const hasAccess = await canViewList(userId, friendUserId, listType, parsedListId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You don\'t have access to this list' },
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

    // Get display name for the list
    const listName = await getListDisplayName(friendUserId, listType);

    // Get items based on list type
    let items: any[] = [];

    if (parsedListId) {
      // Custom list
      const itemsResult = await sql`
        SELECT
          m.id,
          m.tmdb_id,
          m.media_type,
          m.title,
          m.poster_path,
          m.release_year,
          cli.added_at
        FROM custom_list_items cli
        JOIN media m ON m.id = cli.media_id
        WHERE cli.custom_list_id = ${parsedListId}
        ORDER BY cli.added_at DESC
      `;
      items = itemsResult.rows;
    } else {
      // System list - check if it's a status or a tag
      const isTag = ['favorites', 'rewatch', 'nostalgia'].includes(listType);

      if (isTag) {
        // It's a tag - get from user_media_tags
        const itemsResult = await sql`
          SELECT
            m.id,
            m.tmdb_id,
            m.media_type,
            m.title,
            m.poster_path,
            m.release_year,
            um.rating,
            umt.added_at
          FROM user_media_tags umt
          JOIN tags t ON t.id = umt.tag_id
          JOIN user_media um ON um.id = umt.user_media_id
          JOIN media m ON m.id = um.media_id
          WHERE um.user_id = ${friendUserId}
            AND t.slug = ${listType}
          ORDER BY umt.added_at DESC
        `;
        items = itemsResult.rows;
      } else {
        // It's a status
        const itemsResult = await sql`
          SELECT
            m.id,
            m.tmdb_id,
            m.media_type,
            m.title,
            m.poster_path,
            m.release_year,
            um.rating,
            um.created_at as added_at
          FROM user_media um
          JOIN media m ON m.id = um.media_id
          WHERE um.user_id = ${friendUserId}
            AND um.status = ${listType}
          ORDER BY um.created_at DESC
        `;
        items = itemsResult.rows;
      }
    }

    return NextResponse.json({
      friend: {
        id: friend.id,
        name: friend.name,
        username: friend.username,
        image: friend.image,
      },
      listName: listName || listType,
      listType,
      listId: parsedListId,
      items: items.map(item => ({
        id: item.id,
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path,
        release_year: item.release_year,
        rating: item.rating,
      })),
      itemCount: items.length,
    });
  } catch (error) {
    console.error('Error getting friend list items:', error);
    return NextResponse.json(
      { error: 'Failed to get list items' },
      { status: 500 }
    );
  }
}
