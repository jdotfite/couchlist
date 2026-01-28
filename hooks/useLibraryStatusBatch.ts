'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface MediaItem {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
}

type StatusMap = Record<string, string>; // key: "movie-123" or "tv-456", value: status

export function useLibraryStatusBatch(items: MediaItem[], enabled: boolean = true) {
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef<string>('');

  // Create a stable key for the items array
  const itemsKey = items.map(item => {
    const mediaType = item.media_type || ('title' in item ? 'movie' : 'tv');
    return `${mediaType}-${item.id}`;
  }).sort().join(',');

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setStatuses({});
      return;
    }

    // Skip if we already fetched this exact set
    if (fetchedRef.current === itemsKey) {
      return;
    }

    const fetchStatuses = async () => {
      setIsLoading(true);
      try {
        const requestItems = items.map(item => ({
          tmdbId: item.id,
          mediaType: item.media_type || ('title' in item ? 'movie' : 'tv'),
        }));

        const response = await fetch('/api/library/batch-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: requestItems }),
        });

        if (response.ok) {
          const data = await response.json();
          setStatuses(data.statuses);
          fetchedRef.current = itemsKey;
        }
      } catch (error) {
        console.error('Failed to fetch batch statuses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatuses();
  }, [items, enabled, itemsKey]);

  const getStatus = useCallback((id: number, mediaType: 'movie' | 'tv'): string | null => {
    const key = `${mediaType}-${id}`;
    return statuses[key] || null;
  }, [statuses]);

  // Force refresh
  const refresh = useCallback(() => {
    fetchedRef.current = '';
  }, []);

  return { statuses, getStatus, isLoading, refresh };
}
