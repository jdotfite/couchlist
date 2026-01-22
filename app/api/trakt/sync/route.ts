import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getWatchedMovies,
  getWatchedShows,
  getLastActivities,
  getValidAccessToken,
} from '@/lib/trakt';
import { tmdbApi } from '@/lib/tmdb';
import {
  upsertMedia,
  upsertUserMediaStatus,
  getMediaIdByTmdb,
} from '@/lib/library';

interface SyncResult {
  movies: { added: number; skipped: number; failed: number };
  shows: { added: number; skipped: number; failed: number };
}

// POST /api/trakt/sync - Sync watched content from Trakt
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

    const result: SyncResult = {
      movies: { added: 0, skipped: 0, failed: 0 },
      shows: { added: 0, skipped: 0, failed: 0 },
    };

    // Process movies
    for (const item of movies) {
      const tmdbId = item.movie?.ids?.tmdb;
      if (!tmdbId) {
        result.movies.failed++;
        continue;
      }

      try {
        // Check if already in library
        const existingMediaId = await getMediaIdByTmdb(tmdbId, 'movie');
        if (existingMediaId) {
          // Check if user already has this
          const existing = await db`
            SELECT id FROM user_media
            WHERE user_id = ${userId} AND media_id = ${existingMediaId}
          `;
          if (existing.rows[0]) {
            result.movies.skipped++;
            continue;
          }
        }

        // Fetch movie details from TMDB for poster
        let posterPath: string | null = null;
        let title = item.movie.title;
        try {
          const tmdbResponse = await tmdbApi.get(`/movie/${tmdbId}`);
          posterPath = tmdbResponse.data.poster_path;
          title = tmdbResponse.data.title || title;
        } catch {
          // Use Trakt data if TMDB fails
        }

        // Add to library
        const mediaId = await upsertMedia({
          media_id: tmdbId,
          media_type: 'movie',
          title,
          poster_path: posterPath,
          release_year: item.movie.year,
        });

        await upsertUserMediaStatus(userId, mediaId, 'finished');
        result.movies.added++;
      } catch (error) {
        console.error(`Failed to sync movie ${tmdbId}:`, error);
        result.movies.failed++;
      }
    }

    // Process shows
    for (const item of shows) {
      const tmdbId = item.show?.ids?.tmdb;
      if (!tmdbId) {
        result.shows.failed++;
        continue;
      }

      try {
        // Check if already in library
        const existingMediaId = await getMediaIdByTmdb(tmdbId, 'tv');
        if (existingMediaId) {
          const existing = await db`
            SELECT id FROM user_media
            WHERE user_id = ${userId} AND media_id = ${existingMediaId}
          `;
          if (existing.rows[0]) {
            result.shows.skipped++;
            continue;
          }
        }

        // Fetch show details from TMDB for poster
        let posterPath: string | null = null;
        let title = item.show.title;
        try {
          const tmdbResponse = await tmdbApi.get(`/tv/${tmdbId}`);
          posterPath = tmdbResponse.data.poster_path;
          title = tmdbResponse.data.name || title;
        } catch {
          // Use Trakt data if TMDB fails
        }

        // Add to library
        const mediaId = await upsertMedia({
          media_id: tmdbId,
          media_type: 'tv',
          title,
          poster_path: posterPath,
          release_year: item.show.year,
        });

        await upsertUserMediaStatus(userId, mediaId, 'finished');
        result.shows.added++;
      } catch (error) {
        console.error(`Failed to sync show ${tmdbId}:`, error);
        result.shows.failed++;
      }
    }

    // Update last synced timestamp and store activity timestamp
    try {
      const activities = await getLastActivities(accessToken);
      await db`
        UPDATE user_trakt_connections
        SET last_synced_at = NOW(),
            last_activity_at = ${activities.all}
        WHERE user_id = ${userId}
      `;
    } catch {
      // Just update sync time if activities fetch fails
      await db`
        UPDATE user_trakt_connections
        SET last_synced_at = NOW()
        WHERE user_id = ${userId}
      `;
    }

    return NextResponse.json({
      success: true,
      result,
      total: {
        added: result.movies.added + result.shows.added,
        skipped: result.movies.skipped + result.shows.skipped,
        failed: result.movies.failed + result.shows.failed,
      },
    });
  } catch (error) {
    console.error('Trakt sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
