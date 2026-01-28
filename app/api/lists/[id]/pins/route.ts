import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, upsertMedia, getMediaIdByTmdb } from '@/lib/library';
import { addListPin, removeListPin } from '@/lib/lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/lists/[id]/pins - Add a pin to a list
// Accepts either:
//   { mediaId, pinType } - using internal media ID
//   { tmdbId, mediaType, title, posterPath, pinType } - will lookup/create media
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { mediaId, tmdbId, mediaType, title, posterPath, pinType } = body;

    if (!pinType || !['include', 'exclude'].includes(pinType)) {
      return NextResponse.json(
        { error: 'Pin type must be "include" or "exclude"' },
        { status: 400 }
      );
    }

    let internalMediaId: number;

    if (mediaId && typeof mediaId === 'number') {
      // Use provided internal media ID
      internalMediaId = mediaId;
    } else if (tmdbId && mediaType) {
      // Lookup or create media from TMDB ID
      let existingId = await getMediaIdByTmdb(tmdbId, mediaType);
      if (!existingId) {
        // Create the media record
        existingId = await upsertMedia({
          media_id: tmdbId,
          media_type: mediaType,
          title: title || 'Unknown',
          poster_path: posterPath || null,
        });
      }
      internalMediaId = existingId;
    } else {
      return NextResponse.json(
        { error: 'Either mediaId or (tmdbId + mediaType) is required' },
        { status: 400 }
      );
    }

    await addListPin(userId, listId, internalMediaId, pinType);

    return NextResponse.json({ success: true, mediaId: internalMediaId }, { status: 201 });
  } catch (error) {
    console.error('Error adding pin:', error);
    const message = error instanceof Error ? error.message : 'Failed to add pin';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// DELETE /api/lists/[id]/pins - Remove a pin from a list
// Accepts either ?mediaId=123 or ?tmdbId=456&mediaType=movie
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const mediaIdStr = searchParams.get('mediaId');
    const tmdbIdStr = searchParams.get('tmdbId');
    const mediaType = searchParams.get('mediaType');

    let internalMediaId: number | undefined;

    if (mediaIdStr) {
      internalMediaId = parseInt(mediaIdStr, 10);
      if (isNaN(internalMediaId)) {
        return NextResponse.json(
          { error: 'Invalid media ID' },
          { status: 400 }
        );
      }
    } else if (tmdbIdStr && mediaType) {
      const tmdbId = parseInt(tmdbIdStr, 10);
      if (isNaN(tmdbId)) {
        return NextResponse.json(
          { error: 'Invalid TMDB ID' },
          { status: 400 }
        );
      }
      internalMediaId = await getMediaIdByTmdb(tmdbId, mediaType);
      if (!internalMediaId) {
        // Media doesn't exist, so it can't be in any list
        return NextResponse.json({ success: true });
      }
    } else {
      return NextResponse.json(
        { error: 'Either mediaId or (tmdbId + mediaType) is required' },
        { status: 400 }
      );
    }

    await removeListPin(userId, listId, internalMediaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing pin:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove pin';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
