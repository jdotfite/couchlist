'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiscoveryRowType } from '@/types/discovery-rows';
import { TrendingRowItem } from '@/components/home/TrendingRow';

interface UseDiscoveryRowContentReturn {
  items: TrendingRowItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDiscoveryRowContent(rowType: DiscoveryRowType): UseDiscoveryRowContentReturn {
  const [items, setItems] = useState<TrendingRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!rowType) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`/api/discovery-rows/content?type=${rowType}`);

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      setItems(data.results || []);
    } catch (err) {
      console.error(`Failed to fetch content for ${rowType}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [rowType]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const refetch = () => {
    fetchContent();
  };

  return {
    items,
    loading,
    error,
    refetch,
  };
}
