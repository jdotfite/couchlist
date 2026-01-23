import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { db as sql } from '@/lib/db';

// GET - Fetch list items with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { slug } = await params;

    // Get the list (owned or shared)
    const listResult = await sql`
      SELECT cl.id, cl.name, cl.user_id
      FROM custom_lists cl
      LEFT JOIN custom_list_collaborators clc ON clc.custom_list_id = cl.id AND clc.user_id = ${userId} AND clc.status = 'accepted'
      WHERE cl.slug = ${slug}
        AND (cl.user_id = ${userId} OR clc.user_id IS NOT NULL)
      LIMIT 1
    `;

    if (listResult.rows.length === 0) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const list = listResult.rows[0];

    // Get items with media details
    const itemsResult = await sql`
      SELECT
        cli.id as item_id,
        cli.media_id,
        m.tmdb_id,
        m.media_type,
        m.title,
        m.poster_path,
        m.genre_ids,
        m.release_year,
        cli.added_at,
        u.name as added_by_name
      FROM custom_list_items cli
      JOIN media m ON m.id = cli.media_id
      LEFT JOIN users u ON u.id = cli.added_by
      WHERE cli.custom_list_id = ${list.id}
      ORDER BY cli.added_at DESC
    `;

    // Map to ManageableItem format
    const items = itemsResult.rows.map(row => ({
      user_media_id: row.item_id, // Using item_id as unique identifier
      media_id: row.media_id,
      tmdb_id: row.tmdb_id,
      media_type: row.media_type,
      title: row.title,
      poster_path: row.poster_path,
      genre_ids: row.genre_ids,
      release_year: row.release_year,
      status: 'custom_list', // Not a real status, just for display
      rating: null,
      added_date: row.added_at,
      added_by_name: row.added_by_name,
    }));

    return NextResponse.json({
      list: { id: list.id, name: list.name },
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching list items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

// DELETE - Bulk remove items from custom list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { mediaIds } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: 'mediaIds is required' }, { status: 400 });
    }

    // Get the list (owned or shared with edit access)
    const listResult = await sql`
      SELECT cl.id, cl.user_id
      FROM custom_lists cl
      LEFT JOIN custom_list_collaborators clc ON clc.custom_list_id = cl.id AND clc.user_id = ${userId} AND clc.status = 'accepted'
      WHERE cl.slug = ${slug}
        AND (cl.user_id = ${userId} OR clc.user_id IS NOT NULL)
      LIMIT 1
    `;

    if (listResult.rows.length === 0) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const listId = listResult.rows[0].id;
    const mediaIdList = mediaIds.join(',');

    // Delete items
    const deleteResult = await sql`
      DELETE FROM custom_list_items
      WHERE custom_list_id = ${listId}
        AND media_id = ANY(string_to_array(${mediaIdList}, ',')::int[])
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      deleted: deleteResult.rows.length,
    });
  } catch (error) {
    console.error('Error deleting items:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}
