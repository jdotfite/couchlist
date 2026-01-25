import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface DiscoverResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  genre_ids: number[];
}

// GET /api/discover - Discover movies/TV with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || 'all'; // all, movie, tv
    const providers = searchParams.get('providers'); // comma-separated provider IDs
    const genres = searchParams.get('genres'); // comma-separated genre IDs
    const yearMin = searchParams.get('yearMin');
    const yearMax = searchParams.get('yearMax');
    const ratingMin = searchParams.get('ratingMin');
    const runtimeMin = searchParams.get('runtimeMin');
    const runtimeMax = searchParams.get('runtimeMax');
    const sortBy = searchParams.get('sortBy') || 'popularity.desc';
    const page = searchParams.get('page') || '1';

    const results: DiscoverResult[] = [];
    const fetchPromises: Promise<void>[] = [];

    // Build common params
    const buildParams = (mediaType: 'movie' | 'tv') => {
      const params = new URLSearchParams({
        language: 'en-US',
        page,
        sort_by: sortBy,
        'vote_count.gte': '50', // Filter out obscure content
        watch_region: 'US',
      });

      // Add API key if using key-based auth (not token-based)
      if (TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
        params.set('api_key', TMDB_API_KEY);
      }

      if (providers) {
        params.set('with_watch_providers', providers);
        // TMDb requires monetization type when filtering by providers
        // flatrate = subscription streaming (Netflix, Hulu, etc.)
        params.set('with_watch_monetization_types', 'flatrate');
      }

      if (genres) {
        params.set('with_genres', genres);
      }

      if (ratingMin) {
        params.set('vote_average.gte', ratingMin);
      }

      // Year filters
      if (mediaType === 'movie') {
        if (yearMin) params.set('primary_release_date.gte', `${yearMin}-01-01`);
        if (yearMax) params.set('primary_release_date.lte', `${yearMax}-12-31`);
        if (runtimeMin) params.set('with_runtime.gte', runtimeMin);
        if (runtimeMax) params.set('with_runtime.lte', runtimeMax);
      } else {
        if (yearMin) params.set('first_air_date.gte', `${yearMin}-01-01`);
        if (yearMax) params.set('first_air_date.lte', `${yearMax}-12-31`);
        // Runtime doesn't apply to TV in the same way
      }

      return params;
    };

    // Build fetch options with auth
    const fetchOptions: RequestInit = TMDB_ACCESS_TOKEN
      ? { headers: { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}` } }
      : {};

    // Fetch movies
    if (type === 'all' || type === 'movie') {
      const movieParams = buildParams('movie');
      fetchPromises.push(
        fetch(`${TMDB_BASE_URL}/discover/movie?${movieParams}`, fetchOptions)
          .then(res => res.json())
          .then(data => {
            if (data.results) {
              results.push(
                ...data.results.map((item: any) => ({
                  ...item,
                  media_type: 'movie' as const,
                }))
              );
            }
          })
      );
    }

    // Fetch TV shows
    if (type === 'all' || type === 'tv') {
      const tvParams = buildParams('tv');
      fetchPromises.push(
        fetch(`${TMDB_BASE_URL}/discover/tv?${tvParams}`, fetchOptions)
          .then(res => res.json())
          .then(data => {
            if (data.results) {
              results.push(
                ...data.results.map((item: any) => ({
                  ...item,
                  media_type: 'tv' as const,
                }))
              );
            }
          })
      );
    }

    await Promise.all(fetchPromises);

    // Sort combined results
    let sortedResults = results;
    if (type === 'all') {
      // Interleave movies and TV for variety when showing both
      const movies = results.filter(r => r.media_type === 'movie');
      const tvShows = results.filter(r => r.media_type === 'tv');

      // Sort each by the sort criteria first
      const sortFn = (a: DiscoverResult, b: DiscoverResult) => {
        if (sortBy.includes('popularity')) {
          return (b.vote_count || 0) - (a.vote_count || 0);
        }
        if (sortBy.includes('vote_average')) {
          return (b.vote_average || 0) - (a.vote_average || 0);
        }
        if (sortBy.includes('release_date') || sortBy.includes('air_date')) {
          const dateA = a.release_date || a.first_air_date || '';
          const dateB = b.release_date || b.first_air_date || '';
          return sortBy.includes('desc')
            ? dateB.localeCompare(dateA)
            : dateA.localeCompare(dateB);
        }
        return 0;
      };

      movies.sort(sortFn);
      tvShows.sort(sortFn);

      // Interleave
      sortedResults = [];
      const maxLen = Math.max(movies.length, tvShows.length);
      for (let i = 0; i < maxLen; i++) {
        if (movies[i]) sortedResults.push(movies[i]);
        if (tvShows[i]) sortedResults.push(tvShows[i]);
      }
    }

    return NextResponse.json({
      results: sortedResults.slice(0, 40), // Limit to 40 results
      totalResults: results.length,
      page: parseInt(page),
      filters: {
        type,
        providers: providers ? providers.split(',').map(Number) : [],
        genres: genres ? genres.split(',').map(Number) : [],
        yearMin: yearMin ? parseInt(yearMin) : undefined,
        yearMax: yearMax ? parseInt(yearMax) : undefined,
        ratingMin: ratingMin ? parseFloat(ratingMin) : undefined,
        runtimeMin: runtimeMin ? parseInt(runtimeMin) : undefined,
        runtimeMax: runtimeMax ? parseInt(runtimeMax) : undefined,
        sortBy,
      },
    });
  } catch (error) {
    console.error('Error discovering content:', error);
    return NextResponse.json(
      { error: 'Failed to discover content' },
      { status: 500 }
    );
  }
}
