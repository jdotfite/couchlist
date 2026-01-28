import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

// Only warn on server-side (client imports this for getImageUrl but doesn't need credentials)
if (typeof window === 'undefined' && !TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
  console.warn('TMDb API credentials not found. Set TMDB_API_KEY or TMDB_ACCESS_TOKEN in .env.local');
}

export const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000, // 10s timeout to avoid hangs
  headers: TMDB_ACCESS_TOKEN ? {
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
  } : {},
  params: TMDB_API_KEY && !TMDB_ACCESS_TOKEN ? {
    api_key: TMDB_API_KEY,
  } : {},
});

/**
 * Helper that retries TMDb GET requests on 429 or transient network errors with exponential backoff.
 */
export async function tmdbGetWithRetry<T = any>(path: string, opts?: any, retries = 3) {
  let attempt = 0;

  while (true) {
    try {
      return await tmdbApi.get<T>(path, opts);
    } catch (err: any) {
      attempt++;
      const status = err?.response?.status;

      // If we've exhausted retries, rethrow
      if (attempt > retries) throw err;

      // If TMDb returned Retry-After, honor it
      if (status === 429) {
        const retryAfter = err.response.headers?.['retry-after'];
        const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      // Network error (no response) - retry with exponential backoff
      if (!err.response) {
        const wait = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      // Non-retriable HTTP error
      throw err;
    }
  }
}

export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const getImageUrl = (path: string | null, size: string = 'w500') => {
  if (!path) {
    // Return a gray placeholder data URI instead of a file path
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"%3E%3Crect fill="%23262626" width="500" height="750"/%3E%3Ctext fill="%23666" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
  }
  // If already a full URL (from stored data), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // If it's a data URI placeholder, return as-is
  if (path.startsWith('data:')) {
    return path;
  }
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};
