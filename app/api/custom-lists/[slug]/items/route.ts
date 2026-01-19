import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addItemToList, removeItemFromList, getCustomList } from '@/lib/custom-lists';
import { db as sql } from '@/lib/db';

// POST /api/custom-lists/:slug/items - Add media to a custom list
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { mediaId, tmdbId, mediaType, title, posterPath, notes } = body;

    // Need either mediaId (internal) or tmdbId + mediaType (to find/create)
    let finalMediaId = mediaId;

    if (!finalMediaId && tmdbId && mediaType) {
      // Find or create media record
      const existingMedia = await sql`
        SELECT id FROM media WHERE tmdb_id = ${tmdbId} AND media_type = ${mediaType}
      `;

      if (existingMedia.rows[0]) {
        finalMediaId = existingMedia.rows[0].id;
      } else {
        // Create media record
        const newMedia = await sql`
          INSERT INTO media (tmdb_id, media_type, title, poster_path)
          VALUES (${tmdbId}, ${mediaType}, ${title || 'Unknown'}, ${posterPath || null})
          RETURNING id
        `;
        finalMediaId = newMedia.rows[0].id;
      }
    }

    if (!finalMediaId) {
      return NextResponse.json(
        { error: 'Media ID or TMDB ID with media type is required' },
        { status: 400 }
      );
    }

    const result = await addItemToList(
      Number(session.user.id),
      slug,
      finalMediaId,
      notes
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding item to list:', error);
    return NextResponse.json(
      { error: 'Failed to add item to list' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-lists/:slug/items - Remove media from a custom list
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const result = await removeItemFromList(
      Number(session.user.id),
      slug,
      Number(mediaId)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item from list:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from list' },
      { status: 500 }
    );
  }
}
