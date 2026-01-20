// TMDb genre ID to name mapping
// Combined movie and TV genres

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
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV genres (some overlap with movies)
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export function getGenreName(id: number): string | undefined {
  return GENRE_MAP[id];
}

export function getGenreNames(ids: number[] | string | null | undefined, limit: number = 2): string[] {
  if (!ids) return [];

  // Handle comma-separated string from database
  const idArray = typeof ids === 'string'
    ? ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
    : ids;

  return idArray
    .slice(0, limit)
    .map(id => GENRE_MAP[id])
    .filter((name): name is string => !!name);
}
