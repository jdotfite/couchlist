'use client';

import { useState, useEffect, useCallback } from 'react';

export type CoverType = 'last_added' | 'color' | 'specific_item';
export type DisplayInfo = 'rating' | 'tmdb_rating' | 'year' | 'status' | 'none';

export interface ListCardSettings {
  coverType: CoverType;
  coverMediaId?: number;
  showIcon: boolean;
  displayInfo: DisplayInfo;
}

interface ListPreference {
  listType: string;
  displayName: string;
  defaultName: string;
  isHidden: boolean;
  cardSettings: ListCardSettings;
}

const defaultCardSettings: ListCardSettings = {
  coverType: 'last_added',
  showIcon: true,
  displayInfo: 'none',
};

export function useListPreferences() {
  const [preferences, setPreferences] = useState<ListPreference[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/list-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.lists || []);
      }
    } catch (error) {
      console.error('Failed to fetch list preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const getListName = (listType: string): string | null => {
    const pref = preferences.find(p => p.listType === listType);
    return pref?.displayName || null;
  };

  const isListHidden = (listType: string): boolean => {
    const pref = preferences.find(p => p.listType === listType);
    return pref?.isHidden || false;
  };

  const getListCardSettings = (listType: string): ListCardSettings => {
    const pref = preferences.find(p => p.listType === listType);
    return pref?.cardSettings || defaultCardSettings;
  };

  const toggleListHidden = async (listType: string, isHidden: boolean): Promise<boolean> => {
    try {
      const response = await fetch('/api/list-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listType, isHidden }),
      });

      if (response.ok) {
        // Update local state
        setPreferences(prev =>
          prev.map(p =>
            p.listType === listType ? { ...p, isHidden } : p
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to toggle list hidden state:', error);
      return false;
    }
  };

  const updateListCardSettings = async (
    listType: string,
    settings: Partial<ListCardSettings>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/list-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listType,
          coverType: settings.coverType,
          coverMediaId: settings.coverMediaId,
          showIcon: settings.showIcon,
          displayInfo: settings.displayInfo,
        }),
      });

      if (response.ok) {
        // Update local state
        setPreferences(prev =>
          prev.map(p =>
            p.listType === listType
              ? {
                  ...p,
                  cardSettings: {
                    ...p.cardSettings,
                    ...settings,
                  },
                }
              : p
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update list card settings:', error);
      return false;
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchPreferences();
  };

  return {
    preferences,
    loading,
    getListName,
    isListHidden,
    getListCardSettings,
    toggleListHidden,
    updateListCardSettings,
    refetch,
  };
}
