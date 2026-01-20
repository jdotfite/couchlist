import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, getMediaIdByTmdb, updateNotes, getNotes } from '@/lib/library';

// GET /api/notes - Get notes for a media item
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdb_id');
    const mediaType = searchParams.get('media_type');

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: 'Missing tmdb_id or media_type' }, { status: 400 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ notes: null });
    }

    const notes = await getNotes(userId, Number(tmdbId), mediaType);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// PUT /api/notes - Update notes for a media item
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tmdb_id, media_type, notes } = body;

    if (!tmdb_id || !media_type) {
      return NextResponse.json({ error: 'Missing tmdb_id or media_type' }, { status: 400 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const mediaId = await getMediaIdByTmdb(Number(tmdb_id), media_type);
    if (!mediaId) {
      return NextResponse.json({ error: 'Media not in library' }, { status: 404 });
    }

    // Validate notes length (max 1000 characters)
    const trimmedNotes = notes?.trim() || null;
    if (trimmedNotes && trimmedNotes.length > 1000) {
      return NextResponse.json({ error: 'Notes cannot exceed 1000 characters' }, { status: 400 });
    }

    await updateNotes(userId, mediaId, trimmedNotes);
    return NextResponse.json({ success: true, notes: trimmedNotes });
  } catch (error) {
    console.error('Error updating notes:', error);
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
  }
}
