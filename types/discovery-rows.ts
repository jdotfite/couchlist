// Discovery Row Types for customizable browse/discovery rows on the search page

export type DiscoveryRowCategory = 'trending' | 'platform' | 'new_releases' | 'rated' | 'moods';

export type DiscoveryRowType =
  // Trending (3 rows)
  | 'trending_now'
  | 'trending_movies'
  | 'trending_tv'
  // Platform / Where to Watch (9 rows)
  | 'best_on_netflix'
  | 'best_on_max'
  | 'best_on_disney_plus'
  | 'best_on_hulu'
  | 'best_on_prime_video'
  | 'best_on_apple_tv_plus'
  | 'best_on_peacock'
  | 'best_on_paramount_plus'
  | 'free_with_ads'
  // New Releases (4 rows)
  | 'in_theaters'
  | 'new_on_streaming'
  | 'coming_soon'
  | 'airing_this_week'
  // Rated (2 rows)
  | 'top_rated'
  | 'underrated_gems'
  // Moods (5 rows)
  | 'comfort_watches'
  | 'dark_and_intense'
  | 'turn_your_brain_off'
  | 'cry_it_out'
  | 'late_night_weird';

export interface DiscoveryRowConfig {
  type: DiscoveryRowType;
  label: string;
  description: string;
  category: DiscoveryRowCategory;
  mediaType: 'movie' | 'tv' | 'all';
}

export interface UserDiscoveryRow {
  id: number;
  rowType: DiscoveryRowType;
  position: number;
  isVisible: boolean;
}

export interface UserDiscoveryRowWithConfig extends UserDiscoveryRow {
  config: DiscoveryRowConfig;
}

// Category display info
export const DISCOVERY_ROW_CATEGORIES: Record<DiscoveryRowCategory, { label: string; order: number }> = {
  trending: { label: 'Trending', order: 1 },
  platform: { label: 'Where to Watch', order: 2 },
  new_releases: { label: 'New Releases', order: 3 },
  rated: { label: 'Rated', order: 4 },
  moods: { label: 'Moods', order: 5 },
};

// All available discovery row configurations
export const DISCOVERY_ROW_CONFIGS: Record<DiscoveryRowType, DiscoveryRowConfig> = {
  // Trending
  trending_now: {
    type: 'trending_now',
    label: 'Trending Now',
    description: 'Movies and shows everyone is watching',
    category: 'trending',
    mediaType: 'all',
  },
  trending_movies: {
    type: 'trending_movies',
    label: 'Trending Movies',
    description: 'Most popular movies this week',
    category: 'trending',
    mediaType: 'movie',
  },
  trending_tv: {
    type: 'trending_tv',
    label: 'Trending TV',
    description: 'Most popular TV shows this week',
    category: 'trending',
    mediaType: 'tv',
  },
  // Platform / Where to Watch
  best_on_netflix: {
    type: 'best_on_netflix',
    label: 'Best on Netflix',
    description: 'Top picks streaming on Netflix',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_max: {
    type: 'best_on_max',
    label: 'Best on Max',
    description: 'Top picks streaming on Max',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_disney_plus: {
    type: 'best_on_disney_plus',
    label: 'Best on Disney+',
    description: 'Top picks streaming on Disney+',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_hulu: {
    type: 'best_on_hulu',
    label: 'Best on Hulu',
    description: 'Top picks streaming on Hulu',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_prime_video: {
    type: 'best_on_prime_video',
    label: 'Best on Prime Video',
    description: 'Top picks streaming on Prime Video',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_apple_tv_plus: {
    type: 'best_on_apple_tv_plus',
    label: 'Best on Apple TV+',
    description: 'Top picks streaming on Apple TV+',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_peacock: {
    type: 'best_on_peacock',
    label: 'Best on Peacock',
    description: 'Top picks streaming on Peacock',
    category: 'platform',
    mediaType: 'all',
  },
  best_on_paramount_plus: {
    type: 'best_on_paramount_plus',
    label: 'Best on Paramount+',
    description: 'Top picks streaming on Paramount+',
    category: 'platform',
    mediaType: 'all',
  },
  free_with_ads: {
    type: 'free_with_ads',
    label: 'Free with Ads',
    description: 'Great content available for free',
    category: 'platform',
    mediaType: 'all',
  },
  // New Releases
  in_theaters: {
    type: 'in_theaters',
    label: 'In Theaters',
    description: 'Movies currently playing in theaters',
    category: 'new_releases',
    mediaType: 'movie',
  },
  new_on_streaming: {
    type: 'new_on_streaming',
    label: 'New on Streaming',
    description: 'Recently added to streaming services',
    category: 'new_releases',
    mediaType: 'movie',
  },
  coming_soon: {
    type: 'coming_soon',
    label: 'Coming Soon',
    description: 'Upcoming theatrical releases',
    category: 'new_releases',
    mediaType: 'movie',
  },
  airing_this_week: {
    type: 'airing_this_week',
    label: 'Airing This Week',
    description: 'TV shows with new episodes this week',
    category: 'new_releases',
    mediaType: 'tv',
  },
  // Rated
  top_rated: {
    type: 'top_rated',
    label: 'Top Rated',
    description: 'Critically acclaimed favorites',
    category: 'rated',
    mediaType: 'all',
  },
  underrated_gems: {
    type: 'underrated_gems',
    label: 'Underrated Gems',
    description: 'Hidden treasures with high ratings but fewer votes',
    category: 'rated',
    mediaType: 'all',
  },
  // Moods
  comfort_watches: {
    type: 'comfort_watches',
    label: 'Comfort Watches',
    description: 'Feel-good comedies and family films',
    category: 'moods',
    mediaType: 'all',
  },
  dark_and_intense: {
    type: 'dark_and_intense',
    label: 'Dark & Intense',
    description: 'Gripping thrillers and crime dramas',
    category: 'moods',
    mediaType: 'all',
  },
  turn_your_brain_off: {
    type: 'turn_your_brain_off',
    label: 'Turn Your Brain Off',
    description: 'Easy action and comedy entertainment',
    category: 'moods',
    mediaType: 'all',
  },
  cry_it_out: {
    type: 'cry_it_out',
    label: 'Cry It Out',
    description: 'Emotional dramas and tear-jerkers',
    category: 'moods',
    mediaType: 'all',
  },
  late_night_weird: {
    type: 'late_night_weird',
    label: 'Late Night Weird',
    description: 'Sci-fi and fantasy deep cuts',
    category: 'moods',
    mediaType: 'all',
  },
};

// Default rows for new users (just Trending Now)
export const DEFAULT_DISCOVERY_ROWS: DiscoveryRowType[] = ['trending_now'];

// All row types in a convenient array
export const ALL_DISCOVERY_ROW_TYPES: DiscoveryRowType[] = Object.keys(
  DISCOVERY_ROW_CONFIGS
) as DiscoveryRowType[];

// Provider IDs for TMDB watch provider API
export const PROVIDER_IDS: Record<string, number> = {
  netflix: 8,
  max: 1899,
  disney_plus: 337,
  hulu: 15,
  prime_video: 9,
  apple_tv_plus: 350,
  peacock: 386,
  paramount_plus: 531,
};

// Get rows grouped by category
export function getRowsByCategory(): { category: DiscoveryRowCategory; label: string; rows: DiscoveryRowConfig[] }[] {
  const categories = Object.entries(DISCOVERY_ROW_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, { label }]) => ({
      category: key as DiscoveryRowCategory,
      label,
      rows: Object.values(DISCOVERY_ROW_CONFIGS).filter(
        (config) => config.category === key
      ),
    }));

  return categories;
}
