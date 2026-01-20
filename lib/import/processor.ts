import { db as sql } from '@/lib/db';
import {
  upsertMedia,
  upsertUserMediaStatus,
  getMediaIdByTmdb,
  getUserMediaId,
  getSystemTagId,
  addTagToUserMedia,
} from '@/lib/library';
import { searchTMDbMovie } from './tmdb-matcher';
import { tmdbRateLimiter } from './rate-limiter';
import type {
  ImportItem,
  ImportConfig,
  ImportJobItem,
  ImportJobStatus,
  ConflictStrategy,
  MatchConfidence,
} from '@/types/import';

const BATCH_SIZE = 10;

interface ProcessItemResult {
  status: 'success' | 'failed' | 'skipped';
  action?: 'created' | 'updated' | 'skipped_existing';
  tmdbId?: number;
  matchedTitle?: string;
  matchConfidence?: MatchConfidence;
  errorMessage?: string;
}

/**
 * Create a new import job
 */
export async function createImportJob(
  userId: number,
  source: string,
  totalItems: number
): Promise<number> {
  const result = await sql`
    INSERT INTO import_jobs (user_id, source, status, total_items)
    VALUES (${userId}, ${source}, 'pending', ${totalItems})
    RETURNING id
  `;
  return result.rows[0].id;
}

/**
 * Update import job status
 */
export async function updateImportJobStatus(
  jobId: number,
  status: ImportJobStatus,
  errorMessage?: string
): Promise<void> {
  if (status === 'processing') {
    await sql`
      UPDATE import_jobs
      SET status = ${status}, started_at = CURRENT_TIMESTAMP
      WHERE id = ${jobId}
    `;
  } else if (status === 'completed' || status === 'failed') {
    await sql`
      UPDATE import_jobs
      SET status = ${status},
          completed_at = CURRENT_TIMESTAMP,
          error_message = ${errorMessage || null}
      WHERE id = ${jobId}
    `;
  } else {
    await sql`
      UPDATE import_jobs
      SET status = ${status}
      WHERE id = ${jobId}
    `;
  }
}

/**
 * Update import job counters
 */
export async function updateImportJobCounters(
  jobId: number,
  processed: number,
  successful: number,
  failed: number,
  skipped: number
): Promise<void> {
  await sql`
    UPDATE import_jobs
    SET processed_items = ${processed},
        successful_items = ${successful},
        failed_items = ${failed},
        skipped_items = ${skipped}
    WHERE id = ${jobId}
  `;
}

/**
 * Create an import job item record
 */
export async function createImportJobItem(
  jobId: number,
  item: ImportItem,
  result: ProcessItemResult
): Promise<void> {
  await sql`
    INSERT INTO import_job_items (
      import_job_id, source_title, source_year, source_rating, source_status,
      tmdb_id, matched_title, match_confidence, status, result_action, error_message
    )
    VALUES (
      ${jobId},
      ${item.title},
      ${item.year || null},
      ${item.originalRating || null},
      ${item.status || null},
      ${result.tmdbId || null},
      ${result.matchedTitle || null},
      ${result.matchConfidence || null},
      ${result.status},
      ${result.action || null},
      ${result.errorMessage || null}
    )
  `;
}

/**
 * Get existing user media rating
 */
async function getExistingRating(
  userId: number,
  tmdbId: number,
  mediaType: string
): Promise<number | null> {
  const result = await sql`
    SELECT user_media.rating
    FROM user_media
    JOIN media ON media.id = user_media.media_id
    WHERE user_media.user_id = ${userId}
      AND media.tmdb_id = ${tmdbId}
      AND media.media_type = ${mediaType}
  `;
  return result.rows[0]?.rating ?? null;
}

/**
 * Check if user already has this media
 */
async function userHasMedia(
  userId: number,
  tmdbId: number,
  mediaType: string
): Promise<boolean> {
  const result = await sql`
    SELECT 1
    FROM user_media
    JOIN media ON media.id = user_media.media_id
    WHERE user_media.user_id = ${userId}
      AND media.tmdb_id = ${tmdbId}
      AND media.media_type = ${mediaType}
  `;
  return result.rows.length > 0;
}

/**
 * Resolve conflict between existing and imported rating
 */
function shouldUpdateRating(
  existingRating: number | null,
  newRating: number | null,
  strategy: ConflictStrategy
): boolean {
  // No new rating to apply
  if (newRating === null) return false;

  // No existing rating, always add
  if (existingRating === null) return true;

  // Same rating, no update needed
  if (existingRating === newRating) return false;

  switch (strategy) {
    case 'skip':
      return false;
    case 'overwrite':
      return true;
    case 'keep_higher_rating':
      return newRating > existingRating;
    default:
      return false;
  }
}

/**
 * Process a single import item
 */
async function processItem(
  userId: number,
  item: ImportItem,
  config: ImportConfig
): Promise<ProcessItemResult> {
  // Check if we should import this item based on config
  if (item.status === 'watchlist' && !config.importWatchlist) {
    return { status: 'skipped', action: 'skipped_existing' };
  }
  if (item.status === 'watched' && !config.importWatched) {
    return { status: 'skipped', action: 'skipped_existing' };
  }

  // Search TMDb for match (with rate limiting)
  await tmdbRateLimiter.acquire();
  const match = await searchTMDbMovie(item.title, item.year);

  if (!match) {
    return {
      status: 'failed',
      errorMessage: `No TMDb match found for "${item.title}" (${item.year || 'unknown year'})`,
    };
  }

  // Low confidence match
  if (match.confidence === 'failed') {
    return {
      status: 'failed',
      tmdbId: match.tmdbId,
      matchedTitle: match.title,
      matchConfidence: match.confidence,
      errorMessage: `Low confidence match: "${item.title}" → "${match.title}" (${match.year})`,
    };
  }

  const mediaType = 'movie'; // Letterboxd only has movies

  try {
    // Check if user already has this media
    const exists = await userHasMedia(userId, match.tmdbId, mediaType);

    if (exists) {
      // Handle conflict resolution
      const existingRating = await getExistingRating(userId, match.tmdbId, mediaType);
      const newRating = config.importRatings ? item.rating : null;

      if (config.conflictStrategy === 'skip') {
        return {
          status: 'skipped',
          action: 'skipped_existing',
          tmdbId: match.tmdbId,
          matchedTitle: match.title,
          matchConfidence: match.confidence,
        };
      }

      // Check if we should update the rating
      if (shouldUpdateRating(existingRating, newRating ?? null, config.conflictStrategy)) {
        // Update rating
        const mediaId = await getMediaIdByTmdb(match.tmdbId, mediaType);
        if (mediaId) {
          await sql`
            UPDATE user_media
            SET rating = ${newRating},
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${userId} AND media_id = ${mediaId}
          `;
        }

        return {
          status: 'success',
          action: 'updated',
          tmdbId: match.tmdbId,
          matchedTitle: match.title,
          matchConfidence: match.confidence,
        };
      }

      return {
        status: 'skipped',
        action: 'skipped_existing',
        tmdbId: match.tmdbId,
        matchedTitle: match.title,
        matchConfidence: match.confidence,
      };
    }

    // Create new entry
    const mediaId = await upsertMedia({
      media_id: match.tmdbId,
      media_type: mediaType,
      title: match.title,
      poster_path: match.posterPath,
      release_year: match.year,
    });

    // Map status: Letterboxd 'watchlist' → 'watchlist', 'watched' → 'finished'
    const status = item.status === 'watchlist' ? 'watchlist' : 'finished';
    const rating = config.importRatings ? item.rating : null;

    await upsertUserMediaStatus(userId, mediaId, status, rating);

    // Add rewatch tag if applicable
    if (item.isRewatch && config.markRewatchAsTag) {
      const userMediaId = await getUserMediaId(userId, mediaId);
      if (userMediaId) {
        const rewatchTagId = await getSystemTagId('rewatch', 'Rewatch');
        if (rewatchTagId) {
          await addTagToUserMedia(userMediaId, rewatchTagId);
        }
      }
    }

    return {
      status: 'success',
      action: 'created',
      tmdbId: match.tmdbId,
      matchedTitle: match.title,
      matchConfidence: match.confidence,
    };
  } catch (error) {
    console.error('Error processing item:', error);
    return {
      status: 'failed',
      tmdbId: match.tmdbId,
      matchedTitle: match.title,
      matchConfidence: match.confidence,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process all items in an import job
 */
export async function processImportJob(
  jobId: number,
  userId: number,
  items: ImportItem[],
  config: ImportConfig
): Promise<void> {
  await updateImportJobStatus(jobId, 'processing');

  let processed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Process items in batches
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      for (const item of batch) {
        const result = await processItem(userId, item, config);

        // Create item record
        await createImportJobItem(jobId, item, result);

        // Update counters
        processed++;
        if (result.status === 'success') successful++;
        else if (result.status === 'failed') failed++;
        else if (result.status === 'skipped') skipped++;

        // Update job counters periodically (every item for real-time progress)
        await updateImportJobCounters(jobId, processed, successful, failed, skipped);
      }
    }

    await updateImportJobStatus(jobId, 'completed');
  } catch (error) {
    console.error('Import job failed:', error);
    await updateImportJobStatus(
      jobId,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

/**
 * Get import job by ID
 */
export async function getImportJob(jobId: number, userId: number) {
  const result = await sql`
    SELECT * FROM import_jobs
    WHERE id = ${jobId} AND user_id = ${userId}
  `;
  return result.rows[0] || null;
}

/**
 * Get all import jobs for a user
 */
export async function getUserImportJobs(userId: number) {
  const result = await sql`
    SELECT * FROM import_jobs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 20
  `;
  return result.rows;
}

/**
 * Get import job items (for viewing results)
 */
export async function getImportJobItems(jobId: number, userId: number) {
  // First verify the job belongs to this user
  const job = await getImportJob(jobId, userId);
  if (!job) return null;

  const result = await sql`
    SELECT * FROM import_job_items
    WHERE import_job_id = ${jobId}
    ORDER BY id ASC
  `;
  return result.rows;
}

/**
 * Get only failed import job items
 */
export async function getFailedImportJobItems(jobId: number, userId: number) {
  const job = await getImportJob(jobId, userId);
  if (!job) return null;

  const result = await sql`
    SELECT * FROM import_job_items
    WHERE import_job_id = ${jobId}
    AND status = 'failed'
    ORDER BY id ASC
  `;
  return result.rows;
}

/**
 * Delete an import job and its items
 */
export async function deleteImportJob(jobId: number, userId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM import_jobs
    WHERE id = ${jobId} AND user_id = ${userId}
    RETURNING id
  `;
  return result.rows.length > 0;
}
