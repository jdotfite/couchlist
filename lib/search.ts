import { tmdbApi } from './tmdb';
import { SearchResponse, Movie, TVShow } from '@/types';

interface SearchOptions {
  type?: 'movie' | 'tv' | 'multi';
}

interface ParsedQuery {
  cleanQuery: string;
  year?: number;
  variations: string[];
}

/**
 * Common words that can be removed to find better matches
 */
const COMMON_WORDS = ['the', 'a', 'an', 'and', 'of', 'in', 'on', 'at', 'to', 'for'];

/**
 * Normalize a search query by cleaning up common issues
 */
function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .replace(/[''`]/g, "'")         // normalize apostrophes
    .replace(/[""„]/g, '"')         // normalize quotes
    .replace(/[–—]/g, '-')          // normalize dashes
    .replace(/&/g, 'and')           // expand ampersand
    .replace(/[^\w\s'":-]/g, ' ')   // remove special chars except common ones
    .replace(/\s+/g, ' ')           // collapse spaces again
    .trim();
}

/**
 * Extract year from query if present (e.g., "dune 2024" or "dune (2024)")
 */
function extractYear(query: string): { query: string; year?: number } {
  // Match year in parentheses: "movie (2024)"
  const parenMatch = query.match(/\((\d{4})\)\s*$/);
  if (parenMatch) {
    const year = parseInt(parenMatch[1], 10);
    if (year >= 1900 && year <= new Date().getFullYear() + 5) {
      return {
        query: query.replace(/\s*\(\d{4}\)\s*$/, '').trim(),
        year,
      };
    }
  }

  // Match year at end: "movie 2024"
  const endMatch = query.match(/\s(\d{4})$/);
  if (endMatch) {
    const year = parseInt(endMatch[1], 10);
    if (year >= 1900 && year <= new Date().getFullYear() + 5) {
      return {
        query: query.replace(/\s\d{4}$/, '').trim(),
        year,
      };
    }
  }

  return { query };
}

/**
 * Generate query variations for fuzzy matching
 */
function generateVariations(query: string): string[] {
  const variations: string[] = [];
  const words = query.toLowerCase().split(' ');

  // Variation 1: Remove leading "the"
  if (words[0] === 'the' && words.length > 1) {
    variations.push(words.slice(1).join(' '));
  }

  // Variation 2: Remove all common words (if result has at least 2 words or 4+ chars)
  const withoutCommon = words.filter(w => !COMMON_WORDS.includes(w));
  if (withoutCommon.length > 0 && withoutCommon.join(' ') !== query.toLowerCase()) {
    const variation = withoutCommon.join(' ');
    if (variation.length >= 4 || withoutCommon.length >= 2) {
      variations.push(variation);
    }
  }

  // Variation 3: First significant word only (for multi-word titles)
  if (words.length >= 3) {
    const firstSignificant = words.find(w => !COMMON_WORDS.includes(w) && w.length > 2);
    if (firstSignificant && firstSignificant !== query.toLowerCase()) {
      variations.push(firstSignificant);
    }
  }

  // Variation 4: Handle possessives (remove 's)
  if (query.includes("'s")) {
    variations.push(query.replace(/'s/g, 's'));
    variations.push(query.replace(/'s/g, ''));
  }

  // Variation 5: Handle colon/dash titles (search first part)
  if (query.includes(':') || query.includes('-')) {
    const firstPart = query.split(/[:-]/)[0].trim();
    if (firstPart.length >= 3 && firstPart !== query) {
      variations.push(firstPart);
    }
  }

  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Parse and prepare a query for enhanced search
 */
function parseQuery(rawQuery: string): ParsedQuery {
  const normalized = normalizeQuery(rawQuery);
  const { query: cleanQuery, year } = extractYear(normalized);
  const variations = generateVariations(cleanQuery);

  return { cleanQuery, year, variations };
}

/**
 * Perform a single TMDb search
 */
async function searchTMDb(
  query: string,
  type: string,
  year?: number
): Promise<(Movie | TVShow)[]> {
  try {
    const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
    const params: Record<string, string | number> = { query };

    if (year) {
      if (type === 'movie') {
        params.year = year;
      } else if (type === 'tv') {
        params.first_air_date_year = year;
      } else {
        // For multi search, we'll filter by year after
        params.year = year;
      }
    }

    const response = await tmdbApi.get<SearchResponse<Movie | TVShow>>(endpoint, { params });

    // Filter out non-movie/tv results (like people) when using multi search
    let results = type === 'multi'
      ? response.data.results.filter((item: any) =>
          item.media_type === 'movie' || item.media_type === 'tv'
        )
      : response.data.results;

    // For multi search with year, filter results to match year
    if (year && type === 'multi') {
      results = results.filter((item: any) => {
        const itemYear = item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4);
        return !itemYear || itemYear === String(year);
      });
    }

    return results;
  } catch (error) {
    console.error('TMDb search error:', error);
    return [];
  }
}

/**
 * Deduplicate results by ID, keeping the first occurrence (higher priority)
 */
function deduplicateResults(results: (Movie | TVShow)[]): (Movie | TVShow)[] {
  const seen = new Set<string>();
  return results.filter((item: any) => {
    const key = `${item.media_type || (item.title ? 'movie' : 'tv')}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Enhanced search that tries multiple strategies for better results
 */
export async function enhancedSearch(
  rawQuery: string,
  options: SearchOptions = {}
): Promise<{ results: (Movie | TVShow)[]; totalResults: number }> {
  const { type = 'multi' } = options;
  const { cleanQuery, year, variations } = parseQuery(rawQuery);

  // Strategy 1: Search with cleaned query (and year if extracted)
  let results = await searchTMDb(cleanQuery, type, year);

  // If we have good results (3+ items), return them
  if (results.length >= 3) {
    return { results, totalResults: results.length };
  }

  // Strategy 2: If year was extracted but no results, try without year filter
  if (year && results.length < 3) {
    const withoutYear = await searchTMDb(cleanQuery, type);
    results = deduplicateResults([...results, ...withoutYear]);
  }

  // Strategy 3: Try query variations if still not enough results
  if (results.length < 3 && variations.length > 0) {
    // Only try first 2 variations to limit API calls
    const variationsToTry = variations.slice(0, 2);

    for (const variation of variationsToTry) {
      const variationResults = await searchTMDb(variation, type);
      results = deduplicateResults([...results, ...variationResults]);

      // Stop if we have enough results
      if (results.length >= 5) break;
    }
  }

  // Strategy 4: If original query differs from clean query, also try original
  const originalNormalized = rawQuery.trim();
  if (originalNormalized.toLowerCase() !== cleanQuery.toLowerCase() && results.length < 3) {
    const originalResults = await searchTMDb(originalNormalized, type);
    results = deduplicateResults([...results, ...originalResults]);
  }

  return { results, totalResults: results.length };
}
