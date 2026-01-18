import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
  console.warn('TMDb API credentials not found. Set TMDB_API_KEY or TMDB_ACCESS_TOKEN in .env.local');
}

export const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: TMDB_ACCESS_TOKEN ? {
    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
  } : {},
  params: TMDB_API_KEY && !TMDB_ACCESS_TOKEN ? {
    api_key: TMDB_API_KEY,
  } : {},
});

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
