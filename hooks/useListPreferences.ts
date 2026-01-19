'use client';

import { useState, useEffect } from 'react';

interface ListPreference {
  listType: string;
  displayName: string;
  defaultName: string;
}

export function useListPreferences() {
  const [preferences, setPreferences] = useState<ListPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
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
    };

    fetchPreferences();
  }, []);

  const getListName = (listType: string): string | null => {
    const pref = preferences.find(p => p.listType === listType);
    return pref?.displayName || null;
  };

  return { preferences, loading, getListName };
}
