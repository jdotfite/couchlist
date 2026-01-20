'use client';

import { useState, useCallback } from 'react';
import type { ShowProgress, TMDbSeasonDetails, SeasonProgress } from '@/types/episodes';

interface SeasonEpisodeCount {
  seasonNumber: number;
  episodeCount: number;
}

interface UseEpisodeProgressReturn {
  progress: ShowProgress | null;
  seasonData: TMDbSeasonDetails | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  fetchProgress: (tmdbId: number, totalEpisodes: number, seasons: SeasonEpisodeCount[]) => Promise<ShowProgress | null>;
  fetchSeasonData: (tmdbId: number, seasonNumber: number) => Promise<TMDbSeasonDetails | null>;
  markEpisode: (params: MarkEpisodeParams) => Promise<boolean>;
  unmarkEpisode: (tmdbId: number, seasonNumber: number, episodeNumber: number) => Promise<boolean>;
  markSeason: (params: MarkSeasonParams) => Promise<boolean>;
  unmarkSeason: (tmdbId: number, seasonNumber: number) => Promise<boolean>;
  isEpisodeWatched: (seasonNumber: number, episodeNumber: number) => boolean;
}

interface MarkEpisodeParams {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  tmdbEpisodeId?: number;
  title?: string;
  posterPath?: string | null;
}

interface MarkSeasonParams {
  tmdbId: number;
  seasonNumber: number;
  episodes: Array<{ episodeNumber: number; tmdbEpisodeId?: number }>;
  title?: string;
  posterPath?: string | null;
}

export function useEpisodeProgress(): UseEpisodeProgressReturn {
  const [progress, setProgress] = useState<ShowProgress | null>(null);
  const [seasonData, setSeasonData] = useState<TMDbSeasonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async (
    tmdbId: number,
    totalEpisodes: number,
    seasons: SeasonEpisodeCount[]
  ): Promise<ShowProgress | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const seasonsParam = encodeURIComponent(JSON.stringify(seasons));
      const response = await fetch(
        `/api/progress/${tmdbId}?totalEpisodes=${totalEpisodes}&seasons=${seasonsParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      setProgress(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSeasonData = useCallback(async (
    tmdbId: number,
    seasonNumber: number
  ): Promise<TMDbSeasonDetails | null> => {
    setError(null);

    try {
      const response = await fetch(`/api/tv/${tmdbId}/season/${seasonNumber}`);

      if (!response.ok) {
        throw new Error('Failed to fetch season data');
      }

      const data = await response.json();
      setSeasonData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  }, []);

  const markEpisode = useCallback(async (params: MarkEpisodeParams): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to mark episode');
      }

      // Optimistically update local state
      setProgress(prev => {
        if (!prev) return null;

        const newWatchedList = [
          ...prev.watchedList,
          { season: params.seasonNumber, episode: params.episodeNumber, status: 'watched' }
        ];

        const newWatchedCount = prev.watchedEpisodes + 1;
        const newPercentage = prev.totalEpisodes > 0
          ? Math.round((newWatchedCount / prev.totalEpisodes) * 100)
          : 0;

        // Update season progress
        const newSeasons = prev.seasons.map(s => {
          if (s.seasonNumber === params.seasonNumber) {
            const newWatched = s.watchedEpisodes + 1;
            return {
              ...s,
              watchedEpisodes: newWatched,
              isComplete: newWatched >= s.totalEpisodes,
            };
          }
          return s;
        });

        return {
          ...prev,
          watchedEpisodes: newWatchedCount,
          percentage: newPercentage,
          watchedList: newWatchedList,
          seasons: newSeasons,
        };
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const unmarkEpisode = useCallback(async (
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/episodes?tmdbId=${tmdbId}&seasonNumber=${seasonNumber}&episodeNumber=${episodeNumber}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to unmark episode');
      }

      // Optimistically update local state
      setProgress(prev => {
        if (!prev) return null;

        const newWatchedList = prev.watchedList.filter(
          ep => !(ep.season === seasonNumber && ep.episode === episodeNumber)
        );

        const newWatchedCount = prev.watchedEpisodes - 1;
        const newPercentage = prev.totalEpisodes > 0
          ? Math.round((newWatchedCount / prev.totalEpisodes) * 100)
          : 0;

        // Update season progress
        const newSeasons = prev.seasons.map(s => {
          if (s.seasonNumber === seasonNumber) {
            const newWatched = Math.max(0, s.watchedEpisodes - 1);
            return {
              ...s,
              watchedEpisodes: newWatched,
              isComplete: newWatched >= s.totalEpisodes,
            };
          }
          return s;
        });

        return {
          ...prev,
          watchedEpisodes: newWatchedCount,
          percentage: newPercentage,
          watchedList: newWatchedList,
          seasons: newSeasons,
        };
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const markSeason = useCallback(async (params: MarkSeasonParams): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/episodes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to mark season');
      }

      // Optimistically update local state
      setProgress(prev => {
        if (!prev) return null;

        // Filter out any existing entries for this season, then add new ones
        const filteredList = prev.watchedList.filter(ep => ep.season !== params.seasonNumber);
        const newEntries = params.episodes.map(ep => ({
          season: params.seasonNumber,
          episode: ep.episodeNumber,
          status: 'watched' as const,
        }));
        const newWatchedList = [...filteredList, ...newEntries];

        // Recalculate totals
        const newWatchedCount = newWatchedList.length;
        const newPercentage = prev.totalEpisodes > 0
          ? Math.round((newWatchedCount / prev.totalEpisodes) * 100)
          : 0;

        // Update season progress
        const newSeasons = prev.seasons.map(s => {
          if (s.seasonNumber === params.seasonNumber) {
            return {
              ...s,
              watchedEpisodes: params.episodes.length,
              isComplete: params.episodes.length >= s.totalEpisodes,
            };
          }
          return s;
        });

        return {
          ...prev,
          watchedEpisodes: newWatchedCount,
          percentage: newPercentage,
          watchedList: newWatchedList,
          seasons: newSeasons,
        };
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const unmarkSeason = useCallback(async (
    tmdbId: number,
    seasonNumber: number
  ): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/episodes/batch?tmdbId=${tmdbId}&seasonNumber=${seasonNumber}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to unmark season');
      }

      // Optimistically update local state
      setProgress(prev => {
        if (!prev) return null;

        const newWatchedList = prev.watchedList.filter(ep => ep.season !== seasonNumber);
        const removedCount = prev.watchedList.filter(ep => ep.season === seasonNumber).length;

        const newWatchedCount = prev.watchedEpisodes - removedCount;
        const newPercentage = prev.totalEpisodes > 0
          ? Math.round((newWatchedCount / prev.totalEpisodes) * 100)
          : 0;

        // Update season progress
        const newSeasons = prev.seasons.map(s => {
          if (s.seasonNumber === seasonNumber) {
            return {
              ...s,
              watchedEpisodes: 0,
              isComplete: false,
            };
          }
          return s;
        });

        return {
          ...prev,
          watchedEpisodes: newWatchedCount,
          percentage: newPercentage,
          watchedList: newWatchedList,
          seasons: newSeasons,
        };
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const isEpisodeWatched = useCallback((seasonNumber: number, episodeNumber: number): boolean => {
    if (!progress) return false;
    return progress.watchedList.some(
      ep => ep.season === seasonNumber && ep.episode === episodeNumber
    );
  }, [progress]);

  return {
    progress,
    seasonData,
    isLoading,
    isUpdating,
    error,
    fetchProgress,
    fetchSeasonData,
    markEpisode,
    unmarkEpisode,
    markSeason,
    unmarkSeason,
    isEpisodeWatched,
  };
}
