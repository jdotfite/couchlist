'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { getIconComponent } from './IconPicker';
import { getColorValue } from './ColorPicker';

interface CustomList {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  is_shared: boolean;
}

interface CustomListSelectorProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string;
  onCreateList?: () => void;
}

export default function CustomListSelector({
  tmdbId,
  mediaType,
  title,
  posterPath,
  onCreateList,
}: CustomListSelectorProps) {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [internalMediaId, setInternalMediaId] = useState<number | null>(null);

  useEffect(() => {
    fetchListsAndSelections();
  }, [tmdbId, mediaType]);

  const fetchListsAndSelections = async () => {
    try {
      // Fetch all custom lists
      const listsRes = await fetch('/api/custom-lists');
      const listsData = await listsRes.json();
      setLists(listsData.lists || []);

      // Fetch which lists this media is in (also returns internal mediaId)
      const mediaListsRes = await fetch(`/api/custom-lists/media?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      if (mediaListsRes.ok) {
        const mediaListsData = await mediaListsRes.json();
        setSelectedSlugs(new Set(mediaListsData.slugs || []));
        if (mediaListsData.mediaId) {
          setInternalMediaId(mediaListsData.mediaId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleList = async (slug: string) => {
    const isSelected = selectedSlugs.has(slug);
    setTogglingSlug(slug);

    try {
      if (isSelected && internalMediaId) {
        // Remove from list (requires internal mediaId)
        const response = await fetch(`/api/custom-lists/${slug}/items?mediaId=${internalMediaId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSelectedSlugs(prev => {
            const next = new Set(prev);
            next.delete(slug);
            return next;
          });
        }
      } else if (!isSelected) {
        // Add to list (uses tmdbId, will create media record if needed)
        const response = await fetch(`/api/custom-lists/${slug}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId,
            mediaType,
            title,
            posterPath,
          }),
        });

        if (response.ok) {
          setSelectedSlugs(prev => new Set([...prev, slug]));
          // Re-fetch to get the internal mediaId if this was the first add
          if (!internalMediaId) {
            const mediaListsRes = await fetch(`/api/custom-lists/media?tmdbId=${tmdbId}&mediaType=${mediaType}`);
            if (mediaListsRes.ok) {
              const mediaListsData = await mediaListsRes.json();
              if (mediaListsData.mediaId) {
                setInternalMediaId(mediaListsData.mediaId);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle list:', error);
    } finally {
      setTogglingSlug(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="py-2">
        <button
          onClick={onCreateList}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 rounded-lg transition text-gray-400"
        >
          <Plus className="w-5 h-5" />
          <span>Create your first list</span>
        </button>
      </div>
    );
  }

  return (
    <div className="py-2">
      {lists.map((list) => {
        const IconComponent = getIconComponent(list.icon);
        const colorValue = getColorValue(list.color);
        const isSelected = selectedSlugs.has(list.slug);
        const isToggling = togglingSlug === list.slug;

        return (
          <button
            key={list.slug}
            onClick={() => toggleList(list.slug)}
            disabled={isToggling}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50"
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colorValue}20` }}
            >
              <IconComponent className="w-4 h-4" style={{ color: colorValue }} />
            </div>
            <span className="flex-1 text-left font-medium">{list.name}</span>
            {isToggling ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : isSelected ? (
              <div className="w-6 h-6 rounded-md bg-brand-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-md border-2 border-zinc-600" />
            )}
          </button>
        );
      })}

      {onCreateList && (
        <button
          onClick={onCreateList}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 rounded-lg transition text-gray-400 mt-1"
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center border border-dashed border-zinc-600">
            <Plus className="w-4 h-4" />
          </div>
          <span>Create new list</span>
        </button>
      )}
    </div>
  );
}
