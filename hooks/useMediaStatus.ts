'use client';

import { useState, useCallback } from 'react';
import type { MediaStatus } from '@/lib/library';
import { showStatusChange, showRemovedFromLibrary } from '@/lib/toast';

export type { MediaStatus };

export interface MediaInfo {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string;
  genreIds?: number[];
  releaseYear?: number | null;
}

interface UseMediaStatusReturn {
  status: MediaStatus | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  fetchStatus: (mediaId: number, mediaType: string) => Promise<MediaStatus | null>;
  setStatusTo: (targetStatus: string, mediaInfo: MediaInfo) => Promise<boolean>;
  removeFromList: (currentList: string, mediaInfo: MediaInfo) => Promise<boolean>;
  clearStatus: () => void;
}

const STATUS_ENDPOINTS: Record<string, string> = {
  watchlist: '/api/watchlist',
  watching: '/api/watching',
  finished: '/api/watched',
  watched: '/api/watched',
};

export function useMediaStatus(): UseMediaStatusReturn {
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (mediaId: number, mediaType: string): Promise<MediaStatus | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/media-status?tmdb_id=${mediaId}&media_type=${mediaType}`);
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setStatusTo = useCallback(async (targetStatus: string, mediaInfo: MediaInfo): Promise<boolean> => {
    const endpoint = STATUS_ENDPOINTS[targetStatus];
    if (!endpoint) return false;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaInfo.mediaId,
          media_type: mediaInfo.mediaType,
          title: mediaInfo.title,
          poster_path: mediaInfo.posterPath,
          genre_ids: mediaInfo.genreIds,
          release_year: mediaInfo.releaseYear,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set status to ${targetStatus}`);
      }

      // Update local state
      const previousStatus = status?.status || null;
      setStatus(prev => prev ? { ...prev, status: targetStatus } : null);

      // Show toast notification
      showStatusChange(targetStatus as 'watchlist' | 'watching' | 'watched', {
        title: mediaInfo.title,
        mediaType: mediaInfo.mediaType,
        previousStatus,
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

  const removeFromList = useCallback(async (currentList: string, mediaInfo: MediaInfo): Promise<boolean> => {
    const endpoint = STATUS_ENDPOINTS[currentList];
    if (!endpoint) return false;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `${endpoint}?media_id=${mediaInfo.mediaId}&media_type=${mediaInfo.mediaType}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to remove from ${currentList}`);
      }

      // Update local state
      setStatus(prev => prev ? { ...prev, status: null } : null);

      // Show toast notification
      showRemovedFromLibrary(mediaInfo.title);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const clearStatus = useCallback(() => {
    setStatus(null);
    setError(null);
  }, []);

  return {
    status,
    isLoading,
    isUpdating,
    error,
    fetchStatus,
    setStatusTo,
    removeFromList,
    clearStatus,
  };
}
