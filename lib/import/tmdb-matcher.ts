import { tmdbApi, tmdbGetWithRetry } from '@/lib/tmdb';
import type { TMDbMatchResult, MatchConfidence } from '@/types/import';

interface TMDbFindResult {
  movie_results: Array<{
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
  }>;
  tv_results: Array<{
    id: number;
    name: string;
    first_air_date?: string;
    poster_path: string | null;
  }>;
}

interface TMDbSearchResult {
  id: number;
  title: string;
  release_date?: string;
  popularity: number;
  poster_path: string | null;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a score between 0 and 1 (1 = identical)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const len1 = s1.length;
  const len2 = s2.length;

  // Create distance matrix
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);

  return 1 - distance / maxLen;
}

/**
 * Normalize title for comparison
 * Removes common articles, punctuation, and normalizes spacing
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/[^\w\s]/g, ' ')       // Replace punctuation with spaces
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
}

/**
 * Extract year from TMDb release date string
 */
function extractYear(releaseDate?: string): number | undefined {
  if (!releaseDate) return undefined;
  const year = parseInt(releaseDate.substring(0, 4), 10);
  return isNaN(year) ? undefined : year;
}

/**
 * Calculate match score for a TMDb result
 * Higher is better (max ~100)
 */
function calculateMatchScore(
  searchTitle: string,
  searchYear: number | undefined,
  result: TMDbSearchResult
): number {
  let score = 0;

  // Title similarity (0-50 points)
  const normalizedSearch = normalizeTitle(searchTitle);
  const normalizedResult = normalizeTitle(result.title);

  // Exact match bonus
  if (normalizedSearch === normalizedResult) {
    score += 50;
  } else {
    // Similarity score
    const similarity = stringSimilarity(normalizedSearch, normalizedResult);
    score += similarity * 40;

    // Bonus for containing the search term
    if (normalizedResult.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedResult)) {
      score += 5;
    }
  }

  // Year match (0-30 points)
  const resultYear = extractYear(result.release_date);
  if (searchYear && resultYear) {
    if (searchYear === resultYear) {
      score += 30;
    } else if (Math.abs(searchYear - resultYear) === 1) {
      score += 20; // Off by one year (common for release date differences)
    } else if (Math.abs(searchYear - resultYear) <= 2) {
      score += 10;
    }
  } else if (!searchYear && resultYear) {
    // No year provided, slight bonus for having any date
    score += 5;
  }

  // Popularity boost (0-20 points)
  // Log scale to avoid popular movies always winning
  if (result.popularity > 0) {
    const popScore = Math.min(20, Math.log10(result.popularity + 1) * 5);
    score += popScore;
  }

  return score;
}

/**
 * Determine match confidence based on score and conditions
 */
function getConfidence(
  searchTitle: string,
  searchYear: number | undefined,
  result: TMDbSearchResult,
  score: number
): MatchConfidence {
  const normalizedSearch = normalizeTitle(searchTitle);
  const normalizedResult = normalizeTitle(result.title);
  const resultYear = extractYear(result.release_date);

  // Exact title + exact year = exact match
  if (normalizedSearch === normalizedResult) {
    if (searchYear && resultYear && searchYear === resultYear) {
      return 'exact';
    }
    if (!searchYear) {
      return 'exact'; // Exact title, no year to compare
    }
  }

  // High similarity with matching year
  const similarity = stringSimilarity(normalizedSearch, normalizedResult);
  if (similarity >= 0.9 && searchYear && resultYear &&
      Math.abs(searchYear - resultYear) <= 1) {
    return 'exact';
  }

  // Score-based thresholds
  if (score >= 70) return 'exact';
  if (score >= 40) return 'fuzzy';

  return 'failed';
}

/**
 * Search TMDb for a movie by title and optional year
 * Returns the best match with confidence scoring
 */
export async function searchTMDbMovie(
  title: string,
  year?: number
): Promise<TMDbMatchResult | null> {
  try {
    // First search with year if provided
    let response = await tmdbGetWithRetry<{ results: TMDbSearchResult[] }>('/search/movie', {
      params: {
        query: title,
        year: year,
        include_adult: false,
      },
    });

    let results = response.data.results || [];

    // If no results with year, try without year
    if (results.length === 0 && year) {
      response = await tmdbGetWithRetry<{ results: TMDbSearchResult[] }>('/search/movie', {
        params: {
          query: title,
          include_adult: false,
        },
      });
      results = response.data.results || [];
    }

    if (results.length === 0) {
      return null;
    }

    // Score all results and pick the best
    const scoredResults = results.map(result => ({
      result,
      score: calculateMatchScore(title, year, result),
    }));

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    const best = scoredResults[0];
    const confidence = getConfidence(title, year, best.result, best.score);

    // If confidence is too low, return null
    if (confidence === 'failed' && best.score < 30) {
      return null;
    }

    return {
      tmdbId: best.result.id,
      title: best.result.title,
      year: extractYear(best.result.release_date) || 0,
      posterPath: best.result.poster_path,
      confidence,
      score: best.score,
      mediaType: 'movie',
    };
  } catch (error) {
    console.error('TMDb search error:', error);
    return null;
  }
}

/**
 * Find media by IMDb ID using TMDb's external ID lookup
 * This is more reliable than title search
 */
export async function findByIMDbId(
  imdbId: string,
  expectedType?: 'movie' | 'tv'
): Promise<TMDbMatchResult | null> {
  try {
    const response = await tmdbGetWithRetry<TMDbFindResult>(`/find/${imdbId}`, {
      params: { external_source: 'imdb_id' },
    });

    const { movie_results, tv_results } = response.data;

    // If we expect a specific type, prioritize that
    if (expectedType === 'movie' && movie_results.length > 0) {
      const movie = movie_results[0];
      return {
        tmdbId: movie.id,
        title: movie.title,
        year: extractYear(movie.release_date) || 0,
        posterPath: movie.poster_path,
        confidence: 'exact',
        score: 100,
        mediaType: 'movie',
      };
    }

    if (expectedType === 'tv' && tv_results.length > 0) {
      const tv = tv_results[0];
      return {
        tmdbId: tv.id,
        title: tv.name,
        year: extractYear(tv.first_air_date) || 0,
        posterPath: tv.poster_path,
        confidence: 'exact',
        score: 100,
        mediaType: 'tv',
      };
    }

    // No expected type or didn't find expected type - return first result
    if (movie_results.length > 0) {
      const movie = movie_results[0];
      return {
        tmdbId: movie.id,
        title: movie.title,
        year: extractYear(movie.release_date) || 0,
        posterPath: movie.poster_path,
        confidence: 'exact',
        score: 100,
        mediaType: 'movie',
      };
    }

    if (tv_results.length > 0) {
      const tv = tv_results[0];
      return {
        tmdbId: tv.id,
        title: tv.name,
        year: extractYear(tv.first_air_date) || 0,
        posterPath: tv.poster_path,
        confidence: 'exact',
        score: 100,
        mediaType: 'tv',
      };
    }

    return null;
  } catch (error) {
    console.error('TMDb find by IMDb ID error:', error);
    return null;
  }
}

/**
 * Search TMDb for a TV show by title and optional year
 */
export async function searchTMDbTV(
  title: string,
  year?: number
): Promise<TMDbMatchResult | null> {
  try {
    let response = await tmdbGetWithRetry<{ results: TMDbSearchResult[] }>('/search/tv', {
      params: {
        query: title,
        first_air_date_year: year,
      },
    });

    let results = response.data.results || [];

    // If no results with year, try without
    if (results.length === 0 && year) {
      response = await tmdbGetWithRetry<{ results: TMDbSearchResult[] }>('/search/tv', {
        params: { query: title },
      });
      results = response.data.results || [];
    }

    if (results.length === 0) {
      return null;
    }

    // Score and pick best match (reusing movie scoring logic)
    const scoredResults = results.map(result => ({
      result: { ...result, title: result.title || (result as unknown as { name: string }).name },
      score: calculateMatchScore(title, year, {
        ...result,
        title: result.title || (result as unknown as { name: string }).name,
        release_date: result.release_date || (result as unknown as { first_air_date: string }).first_air_date,
      }),
    }));

    scoredResults.sort((a, b) => b.score - a.score);

    const best = scoredResults[0];
    const tvResult = best.result as unknown as { name: string; first_air_date?: string; id: number; poster_path: string | null };
    const confidence = getConfidence(title, year, {
      ...best.result,
      title: tvResult.name,
      release_date: tvResult.first_air_date,
    }, best.score);

    if (confidence === 'failed' && best.score < 30) {
      return null;
    }

    return {
      tmdbId: tvResult.id,
      title: tvResult.name,
      year: extractYear(tvResult.first_air_date) || 0,
      posterPath: tvResult.poster_path,
      confidence,
      score: best.score,
      mediaType: 'tv',
    };
  } catch (error) {
    console.error('TMDb TV search error:', error);
    return null;
  }
}

/**
 * Batch search with rate limiting handled externally
 * Returns results in same order as input
 */
export async function batchSearchTMDb(
  items: Array<{ title: string; year?: number }>,
  onProgress?: (processed: number, total: number) => void
): Promise<(TMDbMatchResult | null)[]> {
  const results: (TMDbMatchResult | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = await searchTMDbMovie(item.title, item.year);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  return results;
}
