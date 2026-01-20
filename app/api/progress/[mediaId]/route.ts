import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getShowProgress, getWatchedEpisodes } from '@/lib/episodes';
import { getMediaIdByTmdb } from '@/lib/library';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { mediaId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr, 10);

  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
  }

  // Get query params for season/episode counts
  const searchParams = request.nextUrl.searchParams;
  const totalEpisodes = parseInt(searchParams.get('totalEpisodes') || '0', 10);
  const seasonsParam = searchParams.get('seasons'); // JSON array of {seasonNumber, episodeCount}

  try {
    // Get internal media ID
    const mediaId = await getMediaIdByTmdb(tmdbId, 'tv');

    if (!mediaId) {
      // No media record yet, return empty progress
      return NextResponse.json({
        mediaId: null,
        totalEpisodes,
        watchedEpisodes: 0,
        percentage: 0,
        currentSeason: 1,
        currentEpisode: 0,
        nextEpisode: null,
        seasons: [],
        watchedList: [],
      });
    }

    // Get user ID
    const { getUserIdByEmail } = await import('@/lib/library');
    const userId = await getUserIdByEmail(session.user.email);

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If no season data provided, just return watched list
    if (!seasonsParam) {
      const watchedEpisodes = await getWatchedEpisodes(userId, mediaId);
      return NextResponse.json({
        mediaId,
        totalEpisodes: 0,
        watchedEpisodes: watchedEpisodes.length,
        percentage: 0,
        currentSeason: 1,
        currentEpisode: 0,
        nextEpisode: null,
        seasons: [],
        watchedList: watchedEpisodes.map((ep) => ({
          season: ep.seasonNumber,
          episode: ep.episodeNumber,
          status: ep.status,
        })),
      });
    }

    // Parse season episode counts
    let seasonEpisodeCounts: Array<{ seasonNumber: number; episodeCount: number }> = [];
    try {
      seasonEpisodeCounts = JSON.parse(seasonsParam);
    } catch {
      return NextResponse.json({ error: 'Invalid seasons parameter' }, { status: 400 });
    }

    const progress = await getShowProgress(userId, mediaId, totalEpisodes, seasonEpisodeCounts);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
