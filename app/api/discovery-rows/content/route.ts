import { NextRequest, NextResponse } from 'next/server';
import { tmdbApi } from '@/lib/tmdb';
import { DiscoveryRowType, DISCOVERY_ROW_CONFIGS, PROVIDER_IDS } from '@/types/discovery-rows';

interface TMDBResult {
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
  media_type?: 'movie' | 'tv';
  genre_ids?: number[];
}

// GET /api/discovery-rows/content?type=trending_now
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rowType = searchParams.get('type') as DiscoveryRowType | null;

    if (!rowType || !(rowType in DISCOVERY_ROW_CONFIGS)) {
      return NextResponse.json(
        { error: 'Invalid or missing row type' },
        { status: 400 }
      );
    }

    const results = await fetchRowContent(rowType);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching discovery row content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

async function fetchRowContent(rowType: DiscoveryRowType): Promise<TMDBResult[]> {
  const config = DISCOVERY_ROW_CONFIGS[rowType];

  switch (rowType) {
    // Trending rows
    case 'trending_now':
      return fetchTrendingAll();
    case 'trending_movies':
      return fetchTrending('movie');
    case 'trending_tv':
      return fetchTrending('tv');

    // Platform rows
    case 'best_on_netflix':
      return fetchByProvider(PROVIDER_IDS.netflix);
    case 'best_on_max':
      return fetchByProvider(PROVIDER_IDS.max);
    case 'best_on_disney_plus':
      return fetchByProvider(PROVIDER_IDS.disney_plus);
    case 'best_on_hulu':
      return fetchByProvider(PROVIDER_IDS.hulu);
    case 'best_on_prime_video':
      return fetchByProvider(PROVIDER_IDS.prime_video);
    case 'best_on_apple_tv_plus':
      return fetchByProvider(PROVIDER_IDS.apple_tv_plus);
    case 'best_on_peacock':
      return fetchByProvider(PROVIDER_IDS.peacock);
    case 'best_on_paramount_plus':
      return fetchByProvider(PROVIDER_IDS.paramount_plus);
    case 'free_with_ads':
      return fetchFreeWithAds();

    // New releases rows
    case 'in_theaters':
      return fetchNowPlaying();
    case 'coming_soon':
      return fetchUpcoming();
    case 'new_on_streaming':
      return fetchNewOnStreaming();
    case 'airing_this_week':
      return fetchAiringThisWeek();

    // Rated rows
    case 'top_rated':
      return fetchTopRated();
    case 'underrated_gems':
      return fetchUnderratedGems();

    // Mood rows
    case 'comfort_watches':
      return fetchComfortWatches();
    case 'dark_and_intense':
      return fetchDarkAndIntense();
    case 'turn_your_brain_off':
      return fetchTurnYourBrainOff();
    case 'cry_it_out':
      return fetchCryItOut();
    case 'late_night_weird':
      return fetchLateNightWeird();

    default:
      return [];
  }
}

// Helper functions for each content type

async function fetchTrendingAll(): Promise<TMDBResult[]> {
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/trending/movie/week'),
    tmdbApi.get('/trending/tv/week'),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  // Interleave movies and TV
  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchTrending(type: 'movie' | 'tv'): Promise<TMDBResult[]> {
  const res = await tmdbApi.get(`/trending/${type}/week`);
  return res.data.results.slice(0, 15).map((item: TMDBResult) => ({
    ...item,
    media_type: type,
  }));
}

async function fetchByProvider(providerId: number): Promise<TMDBResult[]> {
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_watch_providers: providerId,
        watch_region: 'US',
        sort_by: 'popularity.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_watch_providers: providerId,
        watch_region: 'US',
        sort_by: 'popularity.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchFreeWithAds(): Promise<TMDBResult[]> {
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_watch_monetization_types: 'ads',
        watch_region: 'US',
        sort_by: 'popularity.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_watch_monetization_types: 'ads',
        watch_region: 'US',
        sort_by: 'popularity.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchNowPlaying(): Promise<TMDBResult[]> {
  const res = await tmdbApi.get('/movie/now_playing', {
    params: { region: 'US' },
  });
  return res.data.results.slice(0, 15).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
}

async function fetchUpcoming(): Promise<TMDBResult[]> {
  const res = await tmdbApi.get('/movie/upcoming', {
    params: { region: 'US' },
  });
  return res.data.results.slice(0, 15).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
}

async function fetchNewOnStreaming(): Promise<TMDBResult[]> {
  // Movies released digitally in the last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const res = await tmdbApi.get('/discover/movie', {
    params: {
      with_release_type: '4', // Digital release
      'release_date.gte': thirtyDaysAgo.toISOString().split('T')[0],
      'release_date.lte': today.toISOString().split('T')[0],
      watch_region: 'US',
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results.slice(0, 15).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
}

async function fetchAiringThisWeek(): Promise<TMDBResult[]> {
  const res = await tmdbApi.get('/tv/on_the_air');
  return res.data.results.slice(0, 15).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));
}

async function fetchTopRated(): Promise<TMDBResult[]> {
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/movie/top_rated'),
    tmdbApi.get('/tv/top_rated'),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchUnderratedGems(): Promise<TMDBResult[]> {
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        'vote_average.gte': 7.5,
        'vote_count.lte': 1000,
        'vote_count.gte': 100, // Ensure some votes
        sort_by: 'vote_average.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        'vote_average.gte': 7.5,
        'vote_count.lte': 1000,
        'vote_count.gte': 100,
        sort_by: 'vote_average.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchComfortWatches(): Promise<TMDBResult[]> {
  // Comedy (35) and Family (10751) genres, excluding Horror (27) and Thriller (53)
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_genres: '35,10751',
        without_genres: '27,53',
        sort_by: 'popularity.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_genres: '35,10751',
        without_genres: '27,53',
        sort_by: 'popularity.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchDarkAndIntense(): Promise<TMDBResult[]> {
  // Thriller (53), Crime (80), and Drama (18)
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_genres: '53,80',
        sort_by: 'popularity.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_genres: '80,18',
        sort_by: 'popularity.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchTurnYourBrainOff(): Promise<TMDBResult[]> {
  // Action (28) and Comedy (35) with high popularity
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_genres: '28,35',
        sort_by: 'popularity.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_genres: '10759,35', // Action & Adventure for TV
        sort_by: 'popularity.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchCryItOut(): Promise<TMDBResult[]> {
  // Drama (18) and Romance (10749)
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_genres: '18,10749',
        sort_by: 'popularity.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_genres: '18',
        sort_by: 'popularity.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

async function fetchLateNightWeird(): Promise<TMDBResult[]> {
  // Sci-Fi (878) and Fantasy (14) with medium popularity
  const [moviesRes, tvRes] = await Promise.all([
    tmdbApi.get('/discover/movie', {
      params: {
        with_genres: '878,14',
        'vote_average.gte': 6,
        'vote_count.gte': 50,
        'vote_count.lte': 5000,
        sort_by: 'vote_average.desc',
      },
    }),
    tmdbApi.get('/discover/tv', {
      params: {
        with_genres: '10765', // Sci-Fi & Fantasy for TV
        'vote_average.gte': 6,
        'vote_count.gte': 50,
        'vote_count.lte': 5000,
        sort_by: 'vote_average.desc',
      },
    }),
  ]);

  const movies = moviesRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'movie' as const,
  }));
  const tv = tvRes.data.results.slice(0, 10).map((item: TMDBResult) => ({
    ...item,
    media_type: 'tv' as const,
  }));

  return shuffleMix(movies, tv).slice(0, 15);
}

// Helper to interleave two arrays (movie, tv, movie, tv, ...)
function shuffleMix(arr1: TMDBResult[], arr2: TMDBResult[]): TMDBResult[] {
  const result: TMDBResult[] = [];
  const maxLen = Math.max(arr1.length, arr2.length);
  for (let i = 0; i < maxLen; i++) {
    if (arr1[i]) result.push(arr1[i]);
    if (arr2[i]) result.push(arr2[i]);
  }
  return result;
}
