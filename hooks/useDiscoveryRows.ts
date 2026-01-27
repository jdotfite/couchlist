'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DiscoveryRowType,
  DiscoveryRowConfig,
  UserDiscoveryRowWithConfig,
  DiscoveryRowCategory,
} from '@/types/discovery-rows';

interface CategoryWithRows {
  category: DiscoveryRowCategory;
  label: string;
  rows: DiscoveryRowConfig[];
}

interface UseDiscoveryRowsReturn {
  rows: UserDiscoveryRowWithConfig[];
  loading: boolean;
  error: string | null;
  available: DiscoveryRowType[];
  availableByCategory: CategoryWithRows[];
  addRow: (rowType: DiscoveryRowType) => Promise<boolean>;
  removeRow: (rowType: DiscoveryRowType) => Promise<boolean>;
  moveRow: (rowType: DiscoveryRowType, direction: 'up' | 'down') => Promise<boolean>;
  reorderRows: (newOrder: { rowType: DiscoveryRowType; position: number }[]) => Promise<boolean>;
  refetch: () => void;
}

export function useDiscoveryRows(): UseDiscoveryRowsReturn {
  const [rows, setRows] = useState<UserDiscoveryRowWithConfig[]>([]);
  const [available, setAvailable] = useState<DiscoveryRowType[]>([]);
  const [availableByCategory, setAvailableByCategory] = useState<CategoryWithRows[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/discovery-rows');
      if (!response.ok) {
        throw new Error('Failed to fetch discovery rows');
      }
      const data = await response.json();
      setRows(data.rows || []);
      setAvailable(data.available || []);
      setAvailableByCategory(data.availableByCategory || []);
    } catch (err) {
      console.error('Failed to fetch discovery rows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const addRow = async (rowType: DiscoveryRowType): Promise<boolean> => {
    try {
      const response = await fetch('/api/discovery-rows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', rowType }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to add row');
        return false;
      }

      const data = await response.json();
      setRows(data.rows || []);
      setAvailable(data.available || []);
      // Update availableByCategory by filtering out the added row
      setAvailableByCategory(prev =>
        prev.map(cat => ({
          ...cat,
          rows: cat.rows.filter(r => r.type !== rowType),
        })).filter(cat => cat.rows.length > 0)
      );
      return true;
    } catch (err) {
      console.error('Failed to add row:', err);
      setError('Failed to add row');
      return false;
    }
  };

  const removeRow = async (rowType: DiscoveryRowType): Promise<boolean> => {
    try {
      const response = await fetch('/api/discovery-rows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', rowType }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to remove row');
        return false;
      }

      const data = await response.json();
      setRows(data.rows || []);
      setAvailable(data.available || []);
      // Refetch to get updated availableByCategory
      fetchRows();
      return true;
    } catch (err) {
      console.error('Failed to remove row:', err);
      setError('Failed to remove row');
      return false;
    }
  };

  const moveRow = async (rowType: DiscoveryRowType, direction: 'up' | 'down'): Promise<boolean> => {
    try {
      const response = await fetch('/api/discovery-rows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', rowType, direction }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to move row');
        return false;
      }

      const data = await response.json();
      setRows(data.rows || []);
      return true;
    } catch (err) {
      console.error('Failed to move row:', err);
      setError('Failed to move row');
      return false;
    }
  };

  const reorderRows = async (
    newOrder: { rowType: DiscoveryRowType; position: number }[]
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/discovery-rows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: newOrder }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to reorder rows');
        return false;
      }

      // Refetch to get updated order
      await fetchRows();
      return true;
    } catch (err) {
      console.error('Failed to reorder rows:', err);
      setError('Failed to reorder rows');
      return false;
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchRows();
  };

  return {
    rows,
    loading,
    error,
    available,
    availableByCategory,
    addRow,
    removeRow,
    moveRow,
    reorderRows,
    refetch,
  };
}
