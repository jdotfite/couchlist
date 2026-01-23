// Streaming Provider Types for TMDb Watch Provider API

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

// Top 12 US Streaming Providers (by popularity)
export const TOP_US_PROVIDERS: StreamingProvider[] = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
  { provider_id: 15, provider_name: 'Hulu', logo_path: '/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg' },
  { provider_id: 1899, provider_name: 'Max', logo_path: '/6Q3ZYUNA9Hsgj6iWnVsw2gR5V6z.jpg' },
  { provider_id: 337, provider_name: 'Disney+', logo_path: '/97yvRBw1GzX7fXprcF80er19ez.jpg' },
  { provider_id: 386, provider_name: 'Peacock', logo_path: '/xTHltMrZPAJFLQ6qyCBjAnXSmZt.jpg' },
  { provider_id: 9, provider_name: 'Prime Video', logo_path: '/pvske1MyAoymrs5bguRfVqYiM9a.jpg' },
  { provider_id: 2, provider_name: 'Apple TV+', logo_path: '/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg' },
  { provider_id: 531, provider_name: 'Paramount+', logo_path: '/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg' },
  { provider_id: 73, provider_name: 'Tubi', logo_path: '/w8bqcUBnTB0wNR3y1vqCgpeCncz.jpg' },
  { provider_id: 300, provider_name: 'Pluto TV', logo_path: '/aJ0b9BLU1Ig6fp7iECABGprAF8A.jpg' },
  { provider_id: 283, provider_name: 'Crunchyroll', logo_path: '/8Gt1iClBlzTeQs8WQm8rRwbNBtZ.jpg' },
  { provider_id: 350, provider_name: 'Apple TV', logo_path: '/qVmzeepcOMpDJBJ5iNm59doy4N4.jpg' },
];

// Provider ID to name mapping for quick lookup
export const PROVIDER_MAP: Record<number, StreamingProvider> = TOP_US_PROVIDERS.reduce(
  (acc, provider) => ({ ...acc, [provider.provider_id]: provider }),
  {}
);

// TMDb Genre IDs (shared between movies and TV)
export interface Genre {
  id: number;
  name: string;
}

// Common genres that work for both movies and TV
export const COMMON_GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

// TV-specific genres (different IDs from movies)
export const TV_GENRES: Genre[] = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

// Movie-specific genres
export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

// Filter state interface
export interface DiscoverFilters {
  type: 'all' | 'movie' | 'tv';
  providers: number[];
  genres: number[];
  yearMin?: number;
  yearMax?: number;
  ratingMin?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  sortBy: string;
}

// Default filter values
export const DEFAULT_FILTERS: DiscoverFilters = {
  type: 'all',
  providers: [],
  genres: [],
  sortBy: 'popularity.desc',
};

// Sort options for discover
export const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest First' },
  { value: 'primary_release_date.asc', label: 'Oldest First' },
  { value: 'vote_count.desc', label: 'Most Votes' },
];

// User's saved streaming services
export interface UserStreamingService {
  id: number;
  user_id: number;
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  created_at: string;
}
