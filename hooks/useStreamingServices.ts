'use client';

import { useState, useEffect, useCallback } from 'react';
import { StreamingProvider, TOP_US_PROVIDERS } from '@/types/streaming';

interface UseStreamingServicesReturn {
  userProviderIds: number[];
  allProviders: StreamingProvider[];
  isLoading: boolean;
  error: string | null;
  toggleProvider: (providerId: number) => void;
  setProviders: (providerIds: number[]) => Promise<void>;
  isSelected: (providerId: number) => boolean;
  save: () => Promise<void>;
  hasChanges: boolean;
}

export function useStreamingServices(): UseStreamingServicesReturn {
  const [userProviderIds, setUserProviderIds] = useState<number[]>([]);
  const [savedProviderIds, setSavedProviderIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's streaming services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/streaming-services');
        if (!response.ok) {
          throw new Error('Failed to fetch streaming services');
        }
        const data = await response.json();
        setUserProviderIds(data.providerIds || []);
        setSavedProviderIds(data.providerIds || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  const toggleProvider = useCallback((providerId: number) => {
    setUserProviderIds(prev => {
      if (prev.includes(providerId)) {
        return prev.filter(id => id !== providerId);
      }
      return [...prev, providerId];
    });
  }, []);

  const setProviders = useCallback(async (providerIds: number[]) => {
    try {
      const response = await fetch('/api/streaming-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to save streaming services');
      }

      const data = await response.json();
      setUserProviderIds(data.providerIds || providerIds);
      setSavedProviderIds(data.providerIds || providerIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const save = useCallback(async () => {
    await setProviders(userProviderIds);
  }, [userProviderIds, setProviders]);

  const isSelected = useCallback(
    (providerId: number) => userProviderIds.includes(providerId),
    [userProviderIds]
  );

  const hasChanges = JSON.stringify(userProviderIds.sort()) !== JSON.stringify(savedProviderIds.sort());

  return {
    userProviderIds,
    allProviders: TOP_US_PROVIDERS,
    isLoading,
    error,
    toggleProvider,
    setProviders,
    isSelected,
    save,
    hasChanges,
  };
}
