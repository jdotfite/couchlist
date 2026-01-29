'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Search,
  X,
  Loader2,
  Check,
  Plus,
  Film,
} from 'lucide-react';
import BottomSheet from '@/components/BottomSheet';
import { getImageUrl } from '@/lib/tmdb';
import { showSuccess, showError } from '@/lib/toast';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: number;
  title: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

interface ListSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  listId: number;
  listName: string;
  existingTmdbIds: Set<number>;
  onItemAdded: () => void;
}

export default function ListSearchSheet({
  isOpen,
  onClose,
  listId,
  listName,
  existingTmdbIds,
  onItemAdded,
}: ListSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const debouncedQuery = useDebounce(query, 300);

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const searchMedia = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter to only movies and TV shows
          const filtered = (data.results || []).filter(
            (r: SearchResult) => r.media_type === 'movie' || r.media_type === 'tv'
          );
          setResults(filtered.slice(0, 20));
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    searchMedia();
  }, [debouncedQuery]);

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setAddedIds(new Set());
    }
  }, [isOpen]);

  const handleAdd = useCallback(async (item: SearchResult) => {
    const tmdbId = item.id;
    if (addingIds.has(tmdbId) || addedIds.has(tmdbId)) return;

    setAddingIds(prev => new Set(prev).add(tmdbId));

    try {
      const res = await fetch(`/api/lists/${listId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: item.media_type,
          title: item.title || item.name || 'Unknown',
          posterPath: item.poster_path,
          pinType: 'include',
        }),
      });

      if (res.ok) {
        setAddedIds(prev => new Set(prev).add(tmdbId));
        showSuccess(`Added "${item.title || item.name}"`);
        onItemAdded();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to add item');
      }
    } catch (error) {
      showError('Failed to add item');
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev);
        next.delete(tmdbId);
        return next;
      });
    }
  }, [listId, addingIds, addedIds, onItemAdded]);

  const getDisplayTitle = (item: SearchResult) => item.title || item.name || 'Unknown';
  const getYear = (item: SearchResult) => {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear() : null;
  };

  const isInList = (tmdbId: number) => existingTmdbIds.has(tmdbId) || addedIds.has(tmdbId);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header with Search */}
      <div className="px-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Add to {listName}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies & TV shows..."
            className="w-full bg-zinc-800 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-700 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[50vh] overflow-y-auto">
        {/* Loading */}
        {isSearching && (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!isSearching && !query && (
          <div className="py-8 text-center text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Search for movies and TV shows to add</p>
          </div>
        )}

        {/* No Results */}
        {!isSearching && query && results.length === 0 && (
          <div className="py-8 text-center text-gray-400">
            <p>No results for "{query}"</p>
          </div>
        )}

        {/* Results List */}
        {!isSearching && results.length > 0 && (
          <div className="py-2">
            {results.map((item) => {
              const inList = isInList(item.id);
              const isAdding = addingIds.has(item.id);

              return (
                <div
                  key={`${item.media_type}-${item.id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/50"
                >
                  {/* Poster */}
                  <div className="relative w-10 h-14 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                    {item.poster_path ? (
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={getDisplayTitle(item)}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getDisplayTitle(item)}</p>
                    <p className="text-sm text-gray-400">
                      {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                      {getYear(item) && ` • ${getYear(item)}`}
                    </p>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={inList || isAdding}
                    className={`p-2 rounded-full transition ${
                      inList
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    } disabled:cursor-not-allowed`}
                  >
                    {isAdding ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : inList ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
