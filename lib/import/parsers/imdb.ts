import Papa from 'papaparse';
import type {
  IMDbItem,
  IMDbParseResult,
  IMDbRatingsRow,
  IMDbWatchlistRow,
} from '@/types/import';

/**
 * Convert IMDb 1-10 rating to FlickLog 1-5 scale
 * 1-2 → 1, 3-4 → 2, 5-6 → 3, 7-8 → 4, 9-10 → 5
 */
function convertRating(imdbRating: string | undefined): number | undefined {
  if (!imdbRating) return undefined;

  const rating = parseInt(imdbRating, 10);
  if (isNaN(rating) || rating < 1 || rating > 10) return undefined;

  return Math.ceil(rating / 2);
}

/**
 * Parse year from string
 */
function parseYear(yearStr: string | undefined): number | undefined {
  if (!yearStr) return undefined;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 1800 || year > 2100) return undefined;
  return year;
}

/**
 * Map IMDb title type to our media type
 * Returns null for types we don't support (episodes, shorts, etc.)
 */
function mapTitleType(titleType: string | undefined): 'movie' | 'tv' | null {
  if (!titleType) return null;

  const type = titleType.toLowerCase().trim();

  switch (type) {
    case 'movie':
    case 'video':
      return 'movie';
    case 'tvseries':
    case 'tvminiseries':
      return 'tv';
    case 'short':
    case 'tvepisode':
    case 'tvshort':
    case 'tvmovie':
    case 'tvspecial':
      // Skip these types - tvmovie could be movie but often not in TMDb
      return null;
    default:
      return null;
  }
}

/**
 * Validate IMDb ID format (tt followed by 7-8 digits)
 */
function isValidImdbId(id: string | undefined): boolean {
  if (!id) return false;
  return /^tt\d{7,8}$/.test(id.trim());
}

/**
 * Parse CSV content using PapaParse
 * Handles Windows-1252 encoding that IMDb uses
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
 * Detect if this is a ratings export (has 'Your Rating' column) or watchlist
 */
function isRatingsExport(headers: string[]): boolean {
  return headers.some(h => h.toLowerCase().includes('your rating'));
}

/**
 * Parse IMDb ratings CSV
 */
function parseRatingsCSV(content: string): IMDbItem[] {
  const rows = parseCSV<IMDbRatingsRow>(content);
  const items: IMDbItem[] = [];

  for (const row of rows) {
    const mediaType = mapTitleType(row['Title Type']);
    if (!mediaType) continue;

    if (!isValidImdbId(row.Const)) continue;

    const title = row.Title?.trim() || '';
    if (!title) continue;

    items.push({
      imdbId: row.Const.trim(),
      title,
      year: parseYear(row.Year),
      rating: convertRating(row['Your Rating']),
      originalRating: row['Your Rating'] ? parseInt(row['Your Rating'], 10) : undefined,
      status: 'watched' as const,
      watchedDate: row['Date Rated'],
      mediaType,
      directors: row.Directors,
    });
  }

  return items;
}

/**
 * Parse IMDb watchlist CSV
 */
function parseWatchlistCSV(content: string): IMDbItem[] {
  const rows = parseCSV<IMDbWatchlistRow>(content);
  const items: IMDbItem[] = [];

  for (const row of rows) {
    const mediaType = mapTitleType(row['Title Type']);
    if (!mediaType) continue;

    if (!isValidImdbId(row.Const)) continue;

    const title = row.Title?.trim() || '';
    if (!title) continue;

    items.push({
      imdbId: row.Const.trim(),
      title,
      year: parseYear(row.Year),
      status: 'watchlist' as const,
      mediaType,
      directors: row.Directors,
    });
  }

  return items;
}

/**
 * Parse an IMDb CSV export file (ratings or watchlist)
 * IMDb exports are single CSV files, not ZIPs
 */
export async function parseIMDbExport(
  fileContent: ArrayBuffer,
  fileName: string
): Promise<IMDbParseResult> {
  const errors: string[] = [];
  const stats = {
    ratingsCount: 0,
    watchlistCount: 0,
    moviesCount: 0,
    tvShowsCount: 0,
    skippedCount: 0,
    totalUnique: 0,
  };

  // Decode content - try Windows-1252 first (IMDb's encoding), fall back to UTF-8
  let content: string;
  try {
    const decoder = new TextDecoder('windows-1252');
    content = decoder.decode(fileContent);
  } catch {
    const decoder = new TextDecoder('utf-8');
    content = decoder.decode(fileContent);
  }

  // Check if file has content
  if (!content.trim()) {
    return {
      items: [],
      stats,
      errors: ['The CSV file appears to be empty.'],
    };
  }

  // Get headers to determine file type
  const firstLine = content.split('\n')[0] || '';
  const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));

  // Check for required IMDb columns
  if (!headers.some(h => h === 'Const' || h === 'const')) {
    return {
      items: [],
      stats,
      errors: ['This does not appear to be a valid IMDb export. Missing "Const" column with IMDb IDs.'],
    };
  }

  let items: IMDbItem[] = [];
  const isRatings = isRatingsExport(headers);

  try {
    if (isRatings) {
      items = parseRatingsCSV(content);
      stats.ratingsCount = items.length;
    } else {
      items = parseWatchlistCSV(content);
      stats.watchlistCount = items.length;
    }
  } catch (e) {
    errors.push(`Failed to parse ${fileName}: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  // Deduplicate by IMDb ID
  const itemMap = new Map<string, IMDbItem>();
  let skipped = 0;

  for (const item of items) {
    if (!itemMap.has(item.imdbId)) {
      itemMap.set(item.imdbId, item);
    } else {
      skipped++;
    }
  }

  const uniqueItems = Array.from(itemMap.values());

  // Count by media type
  for (const item of uniqueItems) {
    if (item.mediaType === 'movie') {
      stats.moviesCount++;
    } else if (item.mediaType === 'tv') {
      stats.tvShowsCount++;
    }
  }

  stats.skippedCount = skipped;
  stats.totalUnique = uniqueItems.length;

  if (uniqueItems.length === 0 && errors.length === 0) {
    errors.push('No valid movies or TV shows found in the export. Episodes, shorts, and other types are not imported.');
  }

  return { items: uniqueItems, stats, errors };
}
