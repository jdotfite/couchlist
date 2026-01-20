import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markSeasonWatched, unmarkSeason, ensureMediaExists } from '@/lib/episodes';
import { getUserIdByEmail, getMediaIdByTmdb, ensureUserMedia } from '@/lib/library';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tmdbId, seasonNumber, episodes, title, posterPath } = body;

    if (!tmdbId || seasonNumber === undefined || !episodes || !Array.isArray(episodes)) {
      return NextResponse.json(
        { error: 'Missing required fields: tmdbId, seasonNumber, episodes[]' },
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

    // Mark all episodes in the season
    await markSeasonWatched(userId, mediaId, seasonNumber, episodes);

    return NextResponse.json({
      success: true,
      message: `Marked ${episodes.length} episodes in Season ${seasonNumber} as watched`,
    });
  } catch (error) {
    console.error('Error marking season watched:', error);
    return NextResponse.json(
      { error: 'Failed to mark season as watched' },
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

  if (isNaN(tmdbId) || isNaN(seasonNumber)) {
    return NextResponse.json(
      { error: 'Missing required params: tmdbId, seasonNumber' },
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

    // Unmark all episodes in the season
    await unmarkSeason(userId, mediaId, seasonNumber);

    return NextResponse.json({
      success: true,
      message: `Unmarked all episodes in Season ${seasonNumber}`,
    });
  } catch (error) {
    console.error('Error unmarking season:', error);
    return NextResponse.json(
      { error: 'Failed to unmark season' },
      { status: 500 }
    );
  }
}
