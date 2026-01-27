'use client';

import { useState, useEffect, useRef } from 'react';

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface ProviderResult {
  id: number;
  media_type: 'movie' | 'tv';
  providers: WatchProvider[];
}

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: 'movie' | 'tv';
}

type ProvidersMap = Record<string, WatchProvider[]>;

export function useWatchProviders(items: MediaItem[], enabled: boolean = true) {
  const [providers, setProviders] = useState<ProvidersMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || items.length === 0) return;

    // Build list of items to fetch (skip already fetched)
    const itemsToFetch = items
      .map(item => {
        // Use explicit media_type if available, otherwise infer from fields
        const mediaType = item.media_type || (('title' in item && item.title && !item.name) ? 'movie' : 'tv');
        const key = `${mediaType}:${item.id}`;
        return { key, mediaType, id: item.id };
      })
      .filter(item => !fetchedRef.current.has(item.key))
      .slice(0, 12); // Limit to 12 at a time

    if (itemsToFetch.length === 0) return;

    const fetchProviders = async () => {
      setIsLoading(true);

      // Mark as fetched immediately to prevent duplicate requests
      itemsToFetch.forEach(item => fetchedRef.current.add(item.key));

      try {
        const itemsParam = itemsToFetch.map(item => `${item.mediaType}:${item.id}`).join(',');
        const response = await fetch(`/api/watch-providers?items=${itemsParam}`);

        if (!response.ok) throw new Error('Failed to fetch providers');

        const data = await response.json();

        // Update providers map
        setProviders(prev => {
          const newProviders = { ...prev };
          data.results.forEach((result: ProviderResult) => {
            const key = `${result.media_type}:${result.id}`;
            newProviders[key] = result.providers;
          });
          return newProviders;
        });
      } catch (error) {
        console.error('Error fetching watch providers:', error);
        // On error, still mark as fetched to avoid retry loops
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to batch multiple rapid changes
    const timer = setTimeout(fetchProviders, 100);
    return () => clearTimeout(timer);
  }, [items, enabled]);

  // Reset when items completely change (e.g., new search)
  const itemsKey = items.slice(0, 3).map(i => i.id).join(',');
  useEffect(() => {
    // Clear cache when results change significantly
    fetchedRef.current.clear();
    setProviders({});
  }, [itemsKey]);

  const getProviders = (id: number, mediaType: 'movie' | 'tv'): WatchProvider[] => {
    return providers[`${mediaType}:${id}`] || [];
  };

  return { providers, getProviders, isLoading };
}
