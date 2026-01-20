import { db as sql, initDb } from './db';
import { getMediaIdByTmdb, upsertMedia } from './library';
import type { ShowProgress, SeasonProgress, UserEpisode } from '@/types/episodes';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

/**
 * Mark a single episode as watched
 */
export async function markEpisodeWatched(
  userId: number,
  mediaId: number,
  seasonNumber: number,
  episodeNumber: number,
  tmdbEpisodeId?: number
): Promise<void> {
  await ensureDb();

  await sql`
    INSERT INTO user_episodes (user_id, media_id, season_number, episode_number, tmdb_episode_id, status, watched_at)
    VALUES (${userId}, ${mediaId}, ${seasonNumber}, ${episodeNumber}, ${tmdbEpisodeId || null}, 'watched', CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, media_id, season_number, episode_number)
    DO UPDATE SET status = 'watched', watched_at = CURRENT_TIMESTAMP
  `;

  // Update the user_media progress counters
  await updateShowProgress(userId, mediaId);
}

/**
 * Unmark (remove) an episode watch record
 */
export async function unmarkEpisode(
  userId: number,
  mediaId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<void> {
  await ensureDb();

  await sql`
    DELETE FROM user_episodes
    WHERE user_id = ${userId}
      AND media_id = ${mediaId}
      AND season_number = ${seasonNumber}
      AND episode_number = ${episodeNumber}
  `;

  // Update the user_media progress counters
  await updateShowProgress(userId, mediaId);
}

/**
 * Mark all episodes in a season as watched
 */
export async function markSeasonWatched(
  userId: number,
  mediaId: number,
  seasonNumber: number,
  episodes: Array<{ episodeNumber: number; tmdbEpisodeId?: number }>
): Promise<void> {
  await ensureDb();

  // Insert all episodes for the season
  for (const ep of episodes) {
    await sql`
      INSERT INTO user_episodes (user_id, media_id, season_number, episode_number, tmdb_episode_id, status, watched_at)
      VALUES (${userId}, ${mediaId}, ${seasonNumber}, ${ep.episodeNumber}, ${ep.tmdbEpisodeId || null}, 'watched', CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, media_id, season_number, episode_number)
      DO UPDATE SET status = 'watched', watched_at = CURRENT_TIMESTAMP
    `;
  }

  // Update the user_media progress counters
  await updateShowProgress(userId, mediaId);
}

/**
 * Unmark all episodes in a season
 */
export async function unmarkSeason(
  userId: number,
  mediaId: number,
  seasonNumber: number
): Promise<void> {
  await ensureDb();

  await sql`
    DELETE FROM user_episodes
    WHERE user_id = ${userId}
      AND media_id = ${mediaId}
      AND season_number = ${seasonNumber}
  `;

  // Update the user_media progress counters
  await updateShowProgress(userId, mediaId);
}

/**
 * Get all watched episodes for a show
 */
export async function getWatchedEpisodes(
  userId: number,
  mediaId: number
): Promise<UserEpisode[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      id,
      user_id AS "userId",
      media_id AS "mediaId",
      season_number AS "seasonNumber",
      episode_number AS "episodeNumber",
      tmdb_episode_id AS "tmdbEpisodeId",
      status,
      rating,
      notes,
      watched_at AS "watchedAt"
    FROM user_episodes
    WHERE user_id = ${userId} AND media_id = ${mediaId}
    ORDER BY season_number, episode_number
  `;

  return result.rows as UserEpisode[];
}

/**
 * Get watched episodes for a specific season
 */
export async function getWatchedEpisodesBySeason(
  userId: number,
  mediaId: number,
  seasonNumber: number
): Promise<UserEpisode[]> {
  await ensureDb();

  const result = await sql`
    SELECT
      id,
      user_id AS "userId",
      media_id AS "mediaId",
      season_number AS "seasonNumber",
      episode_number AS "episodeNumber",
      tmdb_episode_id AS "tmdbEpisodeId",
      status,
      rating,
      notes,
      watched_at AS "watchedAt"
    FROM user_episodes
    WHERE user_id = ${userId}
      AND media_id = ${mediaId}
      AND season_number = ${seasonNumber}
    ORDER BY episode_number
  `;

  return result.rows as UserEpisode[];
}

/**
 * Update the total_episodes_watched counter on user_media
 */
export async function updateShowProgress(
  userId: number,
  mediaId: number
): Promise<void> {
  await ensureDb();

  // Count total watched episodes
  const countResult = await sql`
    SELECT COUNT(*) AS count
    FROM user_episodes
    WHERE user_id = ${userId}
      AND media_id = ${mediaId}
      AND status = 'watched'
  `;

  const totalWatched = parseInt(countResult.rows[0]?.count || '0', 10);

  // Find the "next" episode (first unwatched) - this requires knowing all episodes
  // For now, we'll just update the total count
  await sql`
    UPDATE user_media
    SET total_episodes_watched = ${totalWatched},
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId} AND media_id = ${mediaId}
  `;
}

/**
 * Get the complete progress state for a show
 */
export async function getShowProgress(
  userId: number,
  mediaId: number,
  totalEpisodes: number,
  seasonEpisodeCounts: Array<{ seasonNumber: number; episodeCount: number }>
): Promise<ShowProgress> {
  await ensureDb();

  // Get all watched episodes
  const watchedEpisodes = await getWatchedEpisodes(userId, mediaId);

  // Build a set for quick lookup
  const watchedSet = new Set(
    watchedEpisodes.map((ep) => `${ep.seasonNumber}-${ep.episodeNumber}`)
  );

  // Calculate per-season progress
  const seasons: SeasonProgress[] = seasonEpisodeCounts.map(({ seasonNumber, episodeCount }) => {
    let watchedCount = 0;
    for (let ep = 1; ep <= episodeCount; ep++) {
      if (watchedSet.has(`${seasonNumber}-${ep}`)) {
        watchedCount++;
      }
    }
    return {
      seasonNumber,
      totalEpisodes: episodeCount,
      watchedEpisodes: watchedCount,
      isComplete: watchedCount >= episodeCount,
    };
  });

  // Find the next unwatched episode
  let nextEpisode: ShowProgress['nextEpisode'] = null;
  for (const season of seasonEpisodeCounts) {
    for (let ep = 1; ep <= season.episodeCount; ep++) {
      if (!watchedSet.has(`${season.seasonNumber}-${ep}`)) {
        nextEpisode = {
          seasonNumber: season.seasonNumber,
          episodeNumber: ep,
          name: '', // Will be filled by the API with TMDb data
          runtime: null,
        };
        break;
      }
    }
    if (nextEpisode) break;
  }

  const totalWatched = watchedEpisodes.length;
  const percentage = totalEpisodes > 0 ? Math.round((totalWatched / totalEpisodes) * 100) : 0;

  return {
    mediaId,
    totalEpisodes,
    watchedEpisodes: totalWatched,
    percentage,
    currentSeason: nextEpisode?.seasonNumber ?? seasons[seasons.length - 1]?.seasonNumber ?? 1,
    currentEpisode: nextEpisode?.episodeNumber ?? 0,
    nextEpisode,
    seasons,
    watchedList: watchedEpisodes.map((ep) => ({
      season: ep.seasonNumber,
      episode: ep.episodeNumber,
      status: ep.status,
    })),
  };
}

/**
 * Helper to get or create media record by TMDb ID
 */
export async function ensureMediaExists(
  tmdbId: number,
  title: string,
  posterPath: string | null
): Promise<number> {
  await ensureDb();

  // Check if media exists
  let mediaId = await getMediaIdByTmdb(tmdbId, 'tv');

  if (!mediaId) {
    // Create it
    mediaId = await upsertMedia({
      media_id: tmdbId,
      media_type: 'tv',
      title,
      poster_path: posterPath,
    });
  }

  return mediaId;
}

/**
 * Check if an episode is watched
 */
export async function isEpisodeWatched(
  userId: number,
  mediaId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<boolean> {
  await ensureDb();

  const result = await sql`
    SELECT id FROM user_episodes
    WHERE user_id = ${userId}
      AND media_id = ${mediaId}
      AND season_number = ${seasonNumber}
      AND episode_number = ${episodeNumber}
      AND status = 'watched'
    LIMIT 1
  `;

  return result.rows.length > 0;
}
