import JSZip from 'jszip';
import Papa from 'papaparse';
import type {
  LetterboxdItem,
  LetterboxdParseResult,
  LetterboxdDiaryRow,
  LetterboxdRatingsRow,
  LetterboxdWatchedRow,
  LetterboxdWatchlistRow,
} from '@/types/import';

/**
 * Convert Letterboxd 0.5-5 star rating to FlickLog 1-5 scale
 * Formula: Math.max(1, Math.min(5, Math.round(letterboxdRating)))
 */
function convertRating(letterboxdRating: string | number | undefined): number | undefined {
  if (!letterboxdRating) return undefined;

  const rating = typeof letterboxdRating === 'string'
    ? parseFloat(letterboxdRating)
    : letterboxdRating;

  if (isNaN(rating) || rating === 0) return undefined;

  // Convert 0.5-5 scale to 1-5 scale (rounding to nearest integer)
  return Math.max(1, Math.min(5, Math.round(rating)));
}

/**
 * Parse year from string, returning undefined if invalid
 */
function parseYear(yearStr: string | undefined): number | undefined {
  if (!yearStr) return undefined;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 1800 || year > 2100) return undefined;
  return year;
}

/**
 * Create a unique key for deduplication
 */
function createItemKey(title: string, year?: number): string {
  return `${title.toLowerCase().trim()}|${year || 'unknown'}`;
}

/**
 * Parse CSV content using PapaParse
 */
function parseCSV<T>(content: string): T[] {
  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors);
  }

  return result.data;
}

/**
 * Parse Letterboxd diary.csv - most complete data source
 */
function parseDiaryCSV(content: string): LetterboxdItem[] {
  const rows = parseCSV<LetterboxdDiaryRow>(content);

  return rows.map(row => ({
    title: row.Name?.trim() || '',
    year: parseYear(row.Year),
    rating: convertRating(row.Rating),
    originalRating: row.Rating ? parseFloat(row.Rating) : undefined,
    status: 'watched' as const,
    watchedDate: row['Watched Date'] || row.Date,
    isRewatch: row.Rewatch?.toLowerCase() === 'yes',
    letterboxdUri: row['Letterboxd URI'],
    tags: row.Tags ? row.Tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  })).filter(item => item.title);
}

/**
 * Parse Letterboxd ratings.csv - has ratings but no watched date
 */
function parseRatingsCSV(content: string): LetterboxdItem[] {
  const rows = parseCSV<LetterboxdRatingsRow>(content);

  return rows.map(row => ({
    title: row.Name?.trim() || '',
    year: parseYear(row.Year),
    rating: convertRating(row.Rating),
    originalRating: row.Rating ? parseFloat(row.Rating) : undefined,
    status: 'watched' as const,
    letterboxdUri: row['Letterboxd URI'],
  })).filter(item => item.title);
}

/**
 * Parse Letterboxd watched.csv - just watched movies, no ratings
 */
function parseWatchedCSV(content: string): LetterboxdItem[] {
  const rows = parseCSV<LetterboxdWatchedRow>(content);

  return rows.map(row => ({
    title: row.Name?.trim() || '',
    year: parseYear(row.Year),
    status: 'watched' as const,
    letterboxdUri: row['Letterboxd URI'],
  })).filter(item => item.title);
}

/**
 * Parse Letterboxd watchlist.csv - movies user wants to watch
 */
function parseWatchlistCSV(content: string): LetterboxdItem[] {
  const rows = parseCSV<LetterboxdWatchlistRow>(content);

  return rows.map(row => ({
    title: row.Name?.trim() || '',
    year: parseYear(row.Year),
    status: 'watchlist' as const,
    letterboxdUri: row['Letterboxd URI'],
  })).filter(item => item.title);
}

/**
 * Parse a Letterboxd ZIP export file
 * Priority order: diary.csv > ratings.csv > watched.csv > watchlist.csv
 * Deduplicates by title+year, keeping the most complete entry
 */
export async function parseLetterboxdExport(zipBuffer: ArrayBuffer): Promise<LetterboxdParseResult> {
  const errors: string[] = [];
  const stats = {
    diaryCount: 0,
    ratingsCount: 0,
    watchedCount: 0,
    watchlistCount: 0,
    totalUnique: 0,
  };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch (e) {
    return {
      items: [],
      stats,
      errors: ['Failed to read ZIP file. Please ensure it is a valid Letterboxd export.'],
    };
  }

  // Map to deduplicate items by title+year
  const itemMap = new Map<string, LetterboxdItem>();

  // Process files in priority order (highest first gets precedence in map)
  // Later entries with the same key will only update if they have more data

  // 1. Watchlist - lowest priority
  const watchlistFile = zip.file('watchlist.csv');
  if (watchlistFile) {
    try {
      const content = await watchlistFile.async('string');
      const items = parseWatchlistCSV(content);
      stats.watchlistCount = items.length;

      for (const item of items) {
        const key = createItemKey(item.title, item.year);
        if (!itemMap.has(key)) {
          itemMap.set(key, item);
        }
      }
    } catch (e) {
      errors.push('Failed to parse watchlist.csv');
    }
  }

  // 2. Watched - has no ratings
  const watchedFile = zip.file('watched.csv');
  if (watchedFile) {
    try {
      const content = await watchedFile.async('string');
      const items = parseWatchedCSV(content);
      stats.watchedCount = items.length;

      for (const item of items) {
        const key = createItemKey(item.title, item.year);
        const existing = itemMap.get(key);

        // Override watchlist items, but not if we already have ratings
        if (!existing || existing.status === 'watchlist') {
          itemMap.set(key, item);
        }
      }
    } catch (e) {
      errors.push('Failed to parse watched.csv');
    }
  }

  // 3. Ratings - has ratings but maybe no watched date
  const ratingsFile = zip.file('ratings.csv');
  if (ratingsFile) {
    try {
      const content = await ratingsFile.async('string');
      const items = parseRatingsCSV(content);
      stats.ratingsCount = items.length;

      for (const item of items) {
        const key = createItemKey(item.title, item.year);
        const existing = itemMap.get(key);

        // Add rating to existing entry or create new one
        if (existing && !existing.rating && item.rating) {
          existing.rating = item.rating;
          existing.originalRating = item.originalRating;
        } else if (!existing || (!existing.rating && item.rating)) {
          itemMap.set(key, item);
        }
      }
    } catch (e) {
      errors.push('Failed to parse ratings.csv');
    }
  }

  // 4. Diary - highest priority, has most complete data
  const diaryFile = zip.file('diary.csv');
  if (diaryFile) {
    try {
      const content = await diaryFile.async('string');
      const items = parseDiaryCSV(content);
      stats.diaryCount = items.length;

      for (const item of items) {
        const key = createItemKey(item.title, item.year);
        const existing = itemMap.get(key);

        // Diary entries always win, but merge data
        if (existing) {
          // Keep rewatch flag from diary
          // Keep tags from diary
          itemMap.set(key, {
            ...existing,
            ...item,
            // Merge tags if both have them
            tags: [...new Set([...(existing.tags || []), ...(item.tags || [])])],
          });
        } else {
          itemMap.set(key, item);
        }
      }
    } catch (e) {
      errors.push('Failed to parse diary.csv');
    }
  }

  // Check if we found any valid files
  if (stats.diaryCount === 0 && stats.ratingsCount === 0 &&
      stats.watchedCount === 0 && stats.watchlistCount === 0) {
    errors.push('No valid Letterboxd CSV files found in the ZIP. Expected diary.csv, ratings.csv, watched.csv, or watchlist.csv.');
  }

  const items = Array.from(itemMap.values());
  stats.totalUnique = items.length;

  return { items, stats, errors };
}
