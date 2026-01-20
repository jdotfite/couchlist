import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markEpisodeWatched, unmarkEpisode, ensureMediaExists } from '@/lib/episodes';
import { getUserIdByEmail, getMediaIdByTmdb, ensureUserMedia } from '@/lib/library';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tmdbId, seasonNumber, episodeNumber, tmdbEpisodeId, title, posterPath } = body;

    if (!tmdbId || seasonNumber === undefined || episodeNumber === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tmdbId, seasonNumber, episodeNumber' },
        { status: 400 }
      );
    }

    // Get user ID
    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure media exists in our database
    const mediaId = await ensureMediaExists(tmdbId, title || 'Unknown Show', posterPath || null);

    // Ensure user_media record exists
    await ensureUserMedia(userId, mediaId);

    // Mark the episode as watched
    await markEpisodeWatched(userId, mediaId, seasonNumber, episodeNumber, tmdbEpisodeId);

    return NextResponse.json({
      success: true,
      message: `Marked S${seasonNumber}E${episodeNumber} as watched`,
    });
  } catch (error) {
    console.error('Error marking episode watched:', error);
    return NextResponse.json(
      { error: 'Failed to mark episode as watched' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const tmdbId = parseInt(searchParams.get('tmdbId') || '', 10);
  const seasonNumber = parseInt(searchParams.get('seasonNumber') || '', 10);
  const episodeNumber = parseInt(searchParams.get('episodeNumber') || '', 10);

  if (isNaN(tmdbId) || isNaN(seasonNumber) || isNaN(episodeNumber)) {
    return NextResponse.json(
      { error: 'Missing required params: tmdbId, seasonNumber, episodeNumber' },
      { status: 400 }
    );
  }

  try {
    // Get user ID
    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get media ID
    const mediaId = await getMediaIdByTmdb(tmdbId, 'tv');
    if (!mediaId) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Unmark the episode
    await unmarkEpisode(userId, mediaId, seasonNumber, episodeNumber);

    return NextResponse.json({
      success: true,
      message: `Unmarked S${seasonNumber}E${episodeNumber}`,
    });
  } catch (error) {
    console.error('Error unmarking episode:', error);
    return NextResponse.json(
      { error: 'Failed to unmark episode' },
      { status: 500 }
    );
  }
}
