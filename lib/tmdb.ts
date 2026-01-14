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
  if (!path) return '/placeholder-poster.png';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};
