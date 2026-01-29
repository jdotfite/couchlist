import { db } from './db';
import { TVShowMetadata } from '@/types/notifications';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDbShowResponse {
  id: number;
  status: string;
  number_of_seasons: number;
  next_episode_to_air: {
    id: number;
    name: string;
    air_date: string;
    season_number: number;
    episode_number: number;
  } | null;
  last_episode_to_air: {
    id: number;
    name: string;
    air_date: string;
    season_number: number;
    episode_number: number;
  } | null;
}

// Rate limiter for TMDb API (40 requests per 10 seconds)
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxTokens: number = 40, refillPeriodMs: number = 10000) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = maxTokens / refillPeriodMs;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const rateLimiter = new RateLimiter();

export async function fetchTMDbShow(tmdbId: number): Promise<TMDbShowResponse | null> {
  await rateLimiter.acquire();

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) {
      console.error(`TMDb API error for show ${tmdbId}: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`Failed to fetch TMDb show ${tmdbId}:`, error);
    return null;
  }
}

export async function getTrackedTVShows(): Promise<Array<{ media_id: number; tmdb_id: number }>> {
  const result = await db`
    SELECT DISTINCT m.id as media_id, m.tmdb_id
    FROM media m
    JOIN user_media um ON m.id = um.media_id
    WHERE m.media_type = 'tv'
      AND um.status IN ('watching', 'watchlist', 'onhold', 'finished')
  `;

  return result.rows as Array<{ media_id: number; tmdb_id: number }>;
}

export async function getTVShowMetadata(mediaId: number): Promise<TVShowMetadata | null> {
  const result = await db`
    SELECT * FROM tv_show_metadata
    WHERE media_id = ${mediaId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as TVShowMetadata;
}

export async function updateTVShowMetadata(
  mediaId: number,
  tmdbId: number,
  data: TMDbShowResponse
): Promise<TVShowMetadata> {
  const result = await db`
    INSERT INTO tv_show_metadata (
      media_id,
      tmdb_id,
      status,
      number_of_seasons,
      next_episode_to_air_date,
      next_episode_season,
      next_episode_number,
      next_episode_name,
      last_synced_at
    ) VALUES (
      ${mediaId},
      ${tmdbId},
      ${data.status},
      ${data.number_of_seasons},
      ${data.next_episode_to_air?.air_date || null},
      ${data.next_episode_to_air?.season_number || null},
      ${data.next_episode_to_air?.episode_number || null},
      ${data.next_episode_to_air?.name || null},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (media_id) DO UPDATE SET
      status = EXCLUDED.status,
      number_of_seasons = EXCLUDED.number_of_seasons,
      next_episode_to_air_date = EXCLUDED.next_episode_to_air_date,
      next_episode_season = EXCLUDED.next_episode_season,
      next_episode_number = EXCLUDED.next_episode_number,
      next_episode_name = EXCLUDED.next_episode_name,
      last_synced_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return result.rows[0] as TVShowMetadata;
}

export interface SyncResult {
  synced: number;
  failed: number;
  newSeasons: number;
  errors: string[];
}

export async function syncShowsForAlerts(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    newSeasons: 0,
    errors: [],
  };

  try {
    // Get all unique TV shows users are tracking
    const trackedShows = await getTrackedTVShows();
    console.log(`Syncing ${trackedShows.length} TV shows...`);

    for (const show of trackedShows) {
      try {
        // Fetch latest TMDb data
        const tmdbData = await fetchTMDbShow(show.tmdb_id);

        if (!tmdbData) {
          result.failed++;
          result.errors.push(`Failed to fetch TMDb data for show ${show.tmdb_id}`);
          continue;
        }

        // Get existing metadata for comparison
        const existing = await getTVShowMetadata(show.media_id);

        // Check for new season
        if (existing && tmdbData.number_of_seasons > (existing.number_of_seasons || 0)) {
          result.newSeasons++;
          // New season detection will be handled by alert generation cron
        }

        // Update cached metadata
        await updateTVShowMetadata(show.media_id, show.tmdb_id, tmdbData);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Error syncing show ${show.tmdb_id}: ${error}`);
      }
    }

    console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed, ${result.newSeasons} new seasons detected`);
    return result;
  } catch (error) {
    console.error('Show sync failed:', error);
    throw error;
  }
}

export async function getShowsWithUpcomingEpisodes(
  daysAhead: number = 7
): Promise<Array<{
  media_id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  next_episode_to_air_date: string;
  next_episode_season: number;
  next_episode_number: number;
  next_episode_name: string | null;
}>> {
  const result = await db`
    SELECT
      tsm.media_id,
      tsm.tmdb_id,
      m.title,
      m.poster_path,
      tsm.next_episode_to_air_date,
      tsm.next_episode_season,
      tsm.next_episode_number,
      tsm.next_episode_name
    FROM tv_show_metadata tsm
    JOIN media m ON tsm.media_id = m.id
    WHERE tsm.next_episode_to_air_date IS NOT NULL
      AND tsm.next_episode_to_air_date <= CURRENT_DATE + ${daysAhead}::integer
      AND tsm.next_episode_to_air_date >= CURRENT_DATE
    ORDER BY tsm.next_episode_to_air_date ASC
  `;

  return result.rows as Array<{
    media_id: number;
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    next_episode_to_air_date: string;
    next_episode_season: number;
    next_episode_number: number;
    next_episode_name: string | null;
  }>;
}

export async function getShowsWithNewSeasons(): Promise<Array<{
  media_id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  new_season_number: number;
  previous_season_count: number;
}>> {
  // This query finds shows where the current number_of_seasons is higher than
  // what we last notified about. We'd track this with a separate column.
  // For now, we rely on the notification deduplication logic.
  const result = await db`
    SELECT
      tsm.media_id,
      tsm.tmdb_id,
      m.title,
      m.poster_path,
      tsm.number_of_seasons as new_season_number,
      COALESCE(tsm.number_of_seasons - 1, 1) as previous_season_count
    FROM tv_show_metadata tsm
    JOIN media m ON tsm.media_id = m.id
    WHERE tsm.number_of_seasons > 1
  `;

  return result.rows as Array<{
    media_id: number;
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    new_season_number: number;
    previous_season_count: number;
  }>;
}
