'use client';

import { useState, useCallback, useEffect } from 'react';
import { DiscoverFilters, DEFAULT_FILTERS, PROVIDER_MAP, COMMON_GENRES } from '@/types/streaming';

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

interface UseDiscoverFiltersReturn {
  filters: DiscoverFilters;
  results: DiscoverResult[];
  isLoading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  setFilter: <K extends keyof DiscoverFilters>(key: K, value: DiscoverFilters[K]) => void;
  toggleProvider: (providerId: number) => void;
  toggleGenre: (genreId: number) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof DiscoverFilters) => void;
  removeProvider: (providerId: number) => void;
  removeGenre: (genreId: number) => void;
  discover: () => Promise<void>;
  getProviderName: (providerId: number) => string;
  getGenreName: (genreId: number) => string;
}

export function useDiscoverFilters(
  initialFilters: Partial<DiscoverFilters> = {}
): UseDiscoverFiltersReturn {
  const [filters, setFilters] = useState<DiscoverFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFilter = useCallback(<K extends keyof DiscoverFilters>(
    key: K,
    value: DiscoverFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleProvider = useCallback((providerId: number) => {
    setFilters(prev => {
      const providers = prev.providers.includes(providerId)
        ? prev.providers.filter(id => id !== providerId)
        : [...prev.providers, providerId];
      return { ...prev, providers };
    });
  }, []);

  const toggleGenre = useCallback((genreId: number) => {
    setFilters(prev => {
      const genres = prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId];
      return { ...prev, genres };
    });
  }, []);

  const removeProvider = useCallback((providerId: number) => {
    setFilters(prev => ({
      ...prev,
      providers: prev.providers.filter(id => id !== providerId),
    }));
  }, []);

  const removeGenre = useCallback((genreId: number) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.filter(id => id !== genreId),
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setResults([]);
  }, []);

  const clearFilter = useCallback((key: keyof DiscoverFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (key === 'providers' || key === 'genres') {
        newFilters[key] = [];
      } else if (key === 'type') {
        newFilters[key] = 'all';
      } else if (key === 'sortBy') {
        newFilters[key] = 'popularity.desc';
      } else {
        newFilters[key] = undefined;
      }
      return newFilters;
    });
  }, []);

  const discover = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();

      if (filters.type !== 'all') {
        params.set('type', filters.type);
      }

      if (filters.providers.length > 0) {
        params.set('providers', filters.providers.join(','));
      }

      if (filters.genres.length > 0) {
        params.set('genres', filters.genres.join(','));
      }

      if (filters.yearMin) {
        params.set('yearMin', filters.yearMin.toString());
      }

      if (filters.yearMax) {
        params.set('yearMax', filters.yearMax.toString());
      }

      if (filters.ratingMin) {
        params.set('ratingMin', filters.ratingMin.toString());
      }

      if (filters.runtimeMin) {
        params.set('runtimeMin', filters.runtimeMin.toString());
      }

      if (filters.runtimeMax) {
        params.set('runtimeMax', filters.runtimeMax.toString());
      }

      if (filters.sortBy !== 'popularity.desc') {
        params.set('sortBy', filters.sortBy);
      }

      const response = await fetch(`/api/discover?${params}`);

      if (!response.ok) {
        throw new Error('Failed to discover content');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Calculate if there are active filters
  const hasActiveFilters =
    filters.providers.length > 0 ||
    filters.genres.length > 0 ||
    filters.type !== 'all' ||
    filters.yearMin !== undefined ||
    filters.yearMax !== undefined ||
    filters.ratingMin !== undefined ||
    filters.runtimeMin !== undefined ||
    filters.runtimeMax !== undefined;

  const activeFilterCount =
    filters.providers.length +
    filters.genres.length +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.yearMin !== undefined ? 1 : 0) +
    (filters.yearMax !== undefined ? 1 : 0) +
    (filters.ratingMin !== undefined ? 1 : 0) +
    (filters.runtimeMin !== undefined || filters.runtimeMax !== undefined ? 1 : 0);

  const getProviderName = useCallback((providerId: number) => {
    return PROVIDER_MAP[providerId]?.provider_name || `Provider ${providerId}`;
  }, []);

  const getGenreName = useCallback((genreId: number) => {
    return COMMON_GENRES.find(g => g.id === genreId)?.name || `Genre ${genreId}`;
  }, []);

  return {
    filters,
    results,
    isLoading,
    error,
    hasActiveFilters,
    activeFilterCount,
    setFilter,
    toggleProvider,
    toggleGenre,
    clearFilters,
    clearFilter,
    removeProvider,
    removeGenre,
    discover,
    getProviderName,
    getGenreName,
  };
}
