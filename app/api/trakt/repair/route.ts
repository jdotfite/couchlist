import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getWatchedMovies,
  getWatchedShows,
  getValidAccessToken,
} from '@/lib/trakt';
import { tmdbApi } from '@/lib/tmdb';
import { getMediaIdByTmdb } from '@/lib/library';

interface RepairResult {
  movies: { updated: number; notFound: number; failed: number };
  shows: { updated: number; notFound: number; failed: number; statusChanges: { toWatching: number; toFinished: number } };
}

// POST /api/trakt/repair - Repair timestamps and statuses for previously synced content
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Get user's Trakt connection
    const connections = await db`
      SELECT * FROM user_trakt_connections WHERE user_id = ${userId}
    `;

    if (!connections.rows[0]) {
      return NextResponse.json(
        { error: 'Not connected to Trakt' },
        { status: 400 }
      );
    }

    const connection = connections.rows[0];

    // Get valid access token (refresh if needed)
    let accessToken: string;
    try {
      const tokenResult = await getValidAccessToken({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        expires_at: connection.expires_at,
      });

      accessToken = tokenResult.accessToken;

      // Update tokens if refreshed
      if (tokenResult.refreshed && tokenResult.newTokens) {
        const expiresAt = new Date(
          Date.now() + tokenResult.newTokens.expires_in * 1000
        ).toISOString();
        await db`
          UPDATE user_trakt_connections
          SET access_token = ${tokenResult.newTokens.access_token},
              refresh_token = ${tokenResult.newTokens.refresh_token},
              expires_at = ${expiresAt}
          WHERE user_id = ${userId}
        `;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return NextResponse.json(
        { error: 'Failed to refresh Trakt token. Please reconnect.' },
        { status: 401 }
      );
    }

    // Fetch watched content from Trakt
    const [movies, shows] = await Promise.all([
      getWatchedMovies(accessToken),
      getWatchedShows(accessToken),
    ]);

    const result: RepairResult = {
      movies: { updated: 0, notFound: 0, failed: 0 },
      shows: { updated: 0, notFound: 0, failed: 0, statusChanges: { toWatching: 0, toFinished: 0 } },
    };

    // Repair movies - update timestamps
    for (const item of movies) {
      const tmdbId = item.movie?.ids?.tmdb;
      if (!tmdbId) {
        result.movies.failed++;
        continue;
      }

      try {
        const mediaId = await getMediaIdByTmdb(tmdbId, 'movie');
        if (!mediaId) {
          result.movies.notFound++;
          continue;
        }

        // Check if user has this item
        const existing = await db`
          SELECT id FROM user_media
          WHERE user_id = ${userId} AND media_id = ${mediaId}
        `;

        if (!existing.rows[0]) {
          result.movies.notFound++;
          continue;
        }

        // Update timestamp to Trakt's last_watched_at
        const watchedAt = new Date(item.last_watched_at).toISOString();
        await db`
          UPDATE user_media
          SET status_updated_at = ${watchedAt},
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId} AND media_id = ${mediaId}
        `;

        result.movies.updated++;
      } catch (error) {
        console.error(`Failed to repair movie ${tmdbId}:`, error);
        result.movies.failed++;
      }
    }

    // Repair shows - update timestamps AND statuses
    for (const item of shows) {
      const tmdbId = item.show?.ids?.tmdb;
      if (!tmdbId) {
        result.shows.failed++;
        continue;
      }

      try {
        const mediaId = await getMediaIdByTmdb(tmdbId, 'tv');
        if (!mediaId) {
          result.shows.notFound++;
          continue;
        }

        // Check if user has this item
        const existing = await db`
          SELECT id, status FROM user_media
          WHERE user_id = ${userId} AND media_id = ${mediaId}
        `;

        if (!existing.rows[0]) {
          result.shows.notFound++;
          continue;
        }

        const currentStatus = existing.rows[0].status;

        // Fetch show details from TMDB to determine correct status
        let showStatus: string | null = null;
        let numberOfEpisodes: number | null = null;
        try {
          const tmdbResponse = await tmdbApi.get(`/tv/${tmdbId}`);
          showStatus = tmdbResponse.data.status;
          numberOfEpisodes = tmdbResponse.data.number_of_episodes;
        } catch {
          // Continue without TMDB data
        }

        // Determine correct status
        let newStatus = 'watching';

        if (showStatus === 'Ended' || showStatus === 'Canceled') {
          if (numberOfEpisodes && item.plays >= numberOfEpisodes) {
            newStatus = 'finished';
          } else if (!numberOfEpisodes) {
            newStatus = 'finished';
          }
        }

        // Track status changes
        if (currentStatus !== newStatus) {
          if (newStatus === 'watching') {
            result.shows.statusChanges.toWatching++;
          } else {
            result.shows.statusChanges.toFinished++;
          }
        }

        // Update timestamp and status
        const watchedAt = new Date(item.last_watched_at).toISOString();
        await db`
          UPDATE user_media
          SET status_updated_at = ${watchedAt},
              status = ${newStatus},
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${userId} AND media_id = ${mediaId}
        `;

        result.shows.updated++;
      } catch (error) {
        console.error(`Failed to repair show ${tmdbId}:`, error);
        result.shows.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      result,
      total: {
        updated: result.movies.updated + result.shows.updated,
        notFound: result.movies.notFound + result.shows.notFound,
        failed: result.movies.failed + result.shows.failed,
      },
    });
  } catch (error) {
    console.error('Trakt repair error:', error);
    return NextResponse.json(
      { error: 'Repair failed' },
      { status: 500 }
    );
  }
}
