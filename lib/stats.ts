import { db as sql } from './db';

// TMDb genre ID to name mapping
export const GENRE_MAP: Record<number, string> = {
  // Movie genres
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

// Kids content certifications
export const KIDS_CERTIFICATIONS = ['G', 'PG', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG'];

export interface StatsOverview {
  totalItems: number;
  totalMovies: number;
  totalTVShows: number;
  totalEpisodesWatched: number;
  totalWatchTimeMinutes: number;
  averageRating: number | null;
  ratedItemsCount: number;
  completionRate: number; // finished / (finished + dropped)
  statusBreakdown: {
    status: string;
    count: number;
  }[];
}

export interface GenreStats {
  genreId: number;
  genreName: string;
  count: number;
  averageRating: number | null;
  totalWatchTimeMinutes: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface YearStats {
  year: number;
  count: number;
}

export interface ActivityStats {
  date: string;
  count: number;
}

export interface DecadeStats {
  decade: string;
  count: number;
}

export async function getStatsOverview(userId: number): Promise<StatsOverview> {
  // Get basic counts by media type and status
  const countsResult = await sql`
    SELECT
      m.media_type,
      um.status,
      COUNT(*)::int as count,
      AVG(um.rating)::numeric(3,2) as avg_rating,
      COUNT(um.rating)::int as rated_count,
      SUM(COALESCE(m.runtime, 0))::int as total_runtime
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE um.user_id = ${userId}
      AND um.status IS NOT NULL
    GROUP BY m.media_type, um.status
  `;

  // Get total episodes watched
  const episodesResult = await sql`
    SELECT COUNT(*)::int as count
    FROM user_episodes
    WHERE user_id = ${userId}
  `;

  let totalItems = 0;
  let totalMovies = 0;
  let totalTVShows = 0;
  let totalWatchTimeMinutes = 0;
  let totalRating = 0;
  let ratedItemsCount = 0;
  let finishedCount = 0;
  let droppedCount = 0;

  const statusMap: Record<string, number> = {};

  for (const row of countsResult.rows) {
    const count = row.count as number;
    totalItems += count;

    if (row.media_type === 'movie') {
      totalMovies += count;
      // Only count watch time for finished movies
      if (row.status === 'finished') {
        totalWatchTimeMinutes += row.total_runtime || 0;
      }
    } else {
      totalTVShows += count;
    }

    if (row.avg_rating && row.rated_count > 0) {
      totalRating += parseFloat(row.avg_rating) * row.rated_count;
      ratedItemsCount += row.rated_count;
    }

    if (row.status === 'finished') {
      finishedCount += count;
    } else if (row.status === 'dropped') {
      droppedCount += count;
    }

    // Aggregate by status (across both media types)
    statusMap[row.status] = (statusMap[row.status] || 0) + count;
  }

  // Calculate TV watch time from episodes (estimate 45 min per episode)
  const totalEpisodesWatched = episodesResult.rows[0]?.count || 0;
  totalWatchTimeMinutes += totalEpisodesWatched * 45;

  const statusBreakdown = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const completionRate = finishedCount + droppedCount > 0
    ? finishedCount / (finishedCount + droppedCount)
    : 0;

  return {
    totalItems,
    totalMovies,
    totalTVShows,
    totalEpisodesWatched,
    totalWatchTimeMinutes,
    averageRating: ratedItemsCount > 0 ? totalRating / ratedItemsCount : null,
    ratedItemsCount,
    completionRate,
    statusBreakdown,
  };
}

export async function getGenreStats(userId: number): Promise<GenreStats[]> {
  const result = await sql`
    SELECT
      m.genre_ids,
      um.rating,
      COALESCE(m.runtime, 0) as runtime,
      um.status
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE um.user_id = ${userId}
      AND um.status IS NOT NULL
      AND m.genre_ids IS NOT NULL
  `;

  const genreMap: Record<number, {
    count: number;
    totalRating: number;
    ratedCount: number;
    totalRuntime: number;
  }> = {};

  for (const row of result.rows) {
    const genreIds = row.genre_ids ? String(row.genre_ids).split(',').map(Number) : [];

    for (const genreId of genreIds) {
      if (!genreMap[genreId]) {
        genreMap[genreId] = { count: 0, totalRating: 0, ratedCount: 0, totalRuntime: 0 };
      }

      genreMap[genreId].count++;

      if (row.rating) {
        genreMap[genreId].totalRating += row.rating;
        genreMap[genreId].ratedCount++;
      }

      if (row.status === 'finished') {
        genreMap[genreId].totalRuntime += row.runtime || 0;
      }
    }
  }

  return Object.entries(genreMap)
    .map(([genreIdStr, stats]) => {
      const genreId = Number(genreIdStr);
      return {
        genreId,
        genreName: GENRE_MAP[genreId] || `Genre ${genreId}`,
        count: stats.count,
        averageRating: stats.ratedCount > 0 ? stats.totalRating / stats.ratedCount : null,
        totalWatchTimeMinutes: stats.totalRuntime,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export async function getRatingDistribution(userId: number): Promise<RatingDistribution[]> {
  const result = await sql`
    SELECT
      rating,
      COUNT(*)::int as count
    FROM user_media
    WHERE user_id = ${userId}
      AND rating IS NOT NULL
    GROUP BY rating
    ORDER BY rating
  `;

  // Ensure all ratings 1-5 are represented
  const distribution: RatingDistribution[] = [];
  const countMap = new Map(result.rows.map(r => [r.rating, r.count]));

  for (let rating = 1; rating <= 5; rating++) {
    distribution.push({
      rating,
      count: countMap.get(rating) || 0,
    });
  }

  return distribution;
}

export async function getYearlyActivity(userId: number): Promise<YearStats[]> {
  const result = await sql`
    SELECT
      EXTRACT(YEAR FROM um.status_updated_at)::int as year,
      COUNT(*)::int as count
    FROM user_media um
    WHERE um.user_id = ${userId}
      AND um.status = 'finished'
      AND um.status_updated_at IS NOT NULL
    GROUP BY EXTRACT(YEAR FROM um.status_updated_at)
    ORDER BY year
  `;

  return result.rows.map(r => ({
    year: r.year,
    count: r.count,
  }));
}

export async function getMonthlyActivity(userId: number, year?: number): Promise<ActivityStats[]> {
  const currentYear = year || new Date().getFullYear();

  const result = await sql`
    SELECT
      TO_CHAR(um.status_updated_at, 'YYYY-MM') as date,
      COUNT(*)::int as count
    FROM user_media um
    WHERE um.user_id = ${userId}
      AND um.status = 'finished'
      AND um.status_updated_at IS NOT NULL
      AND EXTRACT(YEAR FROM um.status_updated_at) = ${currentYear}
    GROUP BY TO_CHAR(um.status_updated_at, 'YYYY-MM')
    ORDER BY date
  `;

  return result.rows.map(r => ({
    date: r.date,
    count: r.count,
  }));
}

export async function getDailyActivity(userId: number, days: number = 365): Promise<ActivityStats[]> {
  const result = await sql`
    SELECT
      TO_CHAR(um.status_updated_at, 'YYYY-MM-DD') as date,
      COUNT(*)::int as count
    FROM user_media um
    WHERE um.user_id = ${userId}
      AND um.status = 'finished'
      AND um.status_updated_at IS NOT NULL
      AND um.status_updated_at >= CURRENT_DATE - ${days}::int * INTERVAL '1 day'
    GROUP BY TO_CHAR(um.status_updated_at, 'YYYY-MM-DD')
    ORDER BY date
  `;

  return result.rows.map(r => ({
    date: r.date,
    count: r.count,
  }));
}

export async function getDecadeStats(userId: number): Promise<DecadeStats[]> {
  const result = await sql`
    SELECT
      (FLOOR(m.release_year / 10) * 10)::int as decade,
      COUNT(*)::int as count
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE um.user_id = ${userId}
      AND um.status IS NOT NULL
      AND m.release_year IS NOT NULL
    GROUP BY FLOOR(m.release_year / 10) * 10
    ORDER BY decade
  `;

  return result.rows.map(r => ({
    decade: `${r.decade}s`,
    count: r.count,
  }));
}

export async function getTopGenre(userId: number): Promise<string | null> {
  const genres = await getGenreStats(userId);
  return genres.length > 0 ? genres[0].genreName : null;
}

// Get all library items with full details for filtering
export async function getLibraryWithDetails(userId: number, filters?: {
  mediaType?: 'movie' | 'tv';
  status?: string;
  minRating?: number;
  maxRating?: number;
  genres?: number[];
  minYear?: number;
  maxYear?: number;
  isKids?: boolean;
}) {
  // Build dynamic query based on filters
  let query = sql`
    SELECT
      um.id as user_media_id,
      m.id as media_id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.poster_path,
      m.genre_ids,
      m.release_year,
      m.runtime,
      m.certification,
      um.status,
      um.rating,
      um.status_updated_at as added_date
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE um.user_id = ${userId}
      AND um.status IS NOT NULL
  `;

  // Note: For complex filters, we'll filter in JS after fetching
  // This is simpler and still fast for typical library sizes

  const result = await query;
  let items = result.rows;

  // Apply filters in JS
  if (filters) {
    if (filters.mediaType) {
      items = items.filter(i => i.media_type === filters.mediaType);
    }
    if (filters.status) {
      items = items.filter(i => i.status === filters.status);
    }
    if (filters.minRating !== undefined) {
      items = items.filter(i => i.rating && i.rating >= filters.minRating!);
    }
    if (filters.maxRating !== undefined) {
      items = items.filter(i => i.rating && i.rating <= filters.maxRating!);
    }
    if (filters.genres && filters.genres.length > 0) {
      items = items.filter(i => {
        const itemGenres = i.genre_ids ? String(i.genre_ids).split(',').map(Number) : [];
        return filters.genres!.some(g => itemGenres.includes(g));
      });
    }
    if (filters.minYear !== undefined) {
      items = items.filter(i => i.release_year && i.release_year >= filters.minYear!);
    }
    if (filters.maxYear !== undefined) {
      items = items.filter(i => i.release_year && i.release_year <= filters.maxYear!);
    }
    if (filters.isKids !== undefined) {
      if (filters.isKids) {
        // Show only kids content
        items = items.filter(i => {
          const itemGenres = i.genre_ids ? String(i.genre_ids).split(',').map(Number) : [];
          const hasKidsGenre = itemGenres.includes(10762) || itemGenres.includes(10751); // Kids or Family
          const hasKidsCertification = i.certification && KIDS_CERTIFICATIONS.includes(i.certification);
          return hasKidsGenre || hasKidsCertification;
        });
      } else {
        // Exclude kids content
        items = items.filter(i => {
          const itemGenres = i.genre_ids ? String(i.genre_ids).split(',').map(Number) : [];
          const hasKidsGenre = itemGenres.includes(10762) || itemGenres.includes(10751);
          const hasKidsCertification = i.certification && KIDS_CERTIFICATIONS.includes(i.certification);
          return !hasKidsGenre && !hasKidsCertification;
        });
      }
    }
  }

  return items;
}

// Bulk delete items from library
// Note: mediaIds are TMDB IDs, not internal media.id values
export async function bulkDeleteFromLibrary(userId: number, tmdbIds: number[]) {
  if (tmdbIds.length === 0) return { deleted: 0 };

  const tmdbIdList = tmdbIds.join(',');

  // Delete from user_media by joining with media table to match tmdb_id
  const result = await sql`
    DELETE FROM user_media
    WHERE user_id = ${userId}
      AND media_id IN (
        SELECT id FROM media
        WHERE tmdb_id = ANY(string_to_array(${tmdbIdList}, ',')::int[])
      )
    RETURNING id
  `;

  return { deleted: result.rows.length };
}

// Bulk update status
// Note: mediaIds are TMDB IDs, not internal media.id values
export async function bulkUpdateStatus(userId: number, tmdbIds: number[], newStatus: string) {
  if (tmdbIds.length === 0) return { updated: 0 };

  const tmdbIdList = tmdbIds.join(',');

  // Update user_media by joining with media table to match tmdb_id
  const result = await sql`
    UPDATE user_media
    SET status = ${newStatus},
        status_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId}
      AND media_id IN (
        SELECT id FROM media
        WHERE tmdb_id = ANY(string_to_array(${tmdbIdList}, ',')::int[])
      )
    RETURNING id
  `;

  return { updated: result.rows.length };
}

// Format watch time for display
export function formatWatchTime(minutes: number): { days: number; hours: number; minutes: number; display: string } {
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;

  let display = '';
  if (days > 0) {
    display = `${days}d ${hours}h`;
  } else if (hours > 0) {
    display = `${hours}h ${mins}m`;
  } else {
    display = `${mins}m`;
  }

  return { days, hours, minutes: mins, display };
}
