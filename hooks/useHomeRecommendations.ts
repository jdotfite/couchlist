import { useState, useEffect, useCallback } from 'react';
import type {
  NewEpisodeItem,
  RecommendationSource,
  RecommendationItem,
} from '@/app/api/home/recommendations/route';

interface HomeRecommendationsData {
  newEpisodes: NewEpisodeItem[];
  recommendationSource: RecommendationSource | null;
  recommendations: RecommendationItem[];
  trending: RecommendationItem[];
}

interface UseHomeRecommendationsReturn extends HomeRecommendationsData {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let cachedData: HomeRecommendationsData | null = null;
let cacheTimestamp: number | null = null;

export function useHomeRecommendations(): UseHomeRecommendationsReturn {
  const [data, setData] = useState<HomeRecommendationsData>({
    newEpisodes: [],
    recommendationSource: null,
    recommendations: [],
    trending: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // Use cache if valid and not forcing refresh
    if (!force && cachedData && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/home/recommendations');

      if (response.status === 401) {
        // User not authenticated, return empty data
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const result: HomeRecommendationsData = await response.json();

      // Update cache
      cachedData = result;
      cacheTimestamp = Date.now();

      setData(result);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    ...data,
    isLoading,
    error,
    refetch,
  };
}
