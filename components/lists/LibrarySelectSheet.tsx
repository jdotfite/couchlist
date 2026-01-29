'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Search,
  X,
  Loader2,
  Check,
  Film,
  Tv,
  Square,
  CheckSquare,
} from 'lucide-react';
import BottomSheet from '@/components/BottomSheet';
import { getImageUrl } from '@/lib/tmdb';
import { showSuccess, showError } from '@/lib/toast';
import { useDebounce } from '@/hooks/useDebounce';

interface LibraryItem {
  id: number;
  media_id: number; // tmdb_id
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  release_year: number | null;
  rating: number | null;
}

interface LibrarySelectSheetProps {
  isOpen: boolean;
  onClose: () => void;
  listId: number;
  listName: string;
  existingTmdbIds: Set<number>;
  onItemsAdded: () => void;
}

type StatusFilter = 'all' | 'watchlist' | 'watching' | 'finished';
type TypeFilter = 'all' | 'movie' | 'tv';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'finished', label: 'Watched' },
];

export default function LibrarySelectSheet({
  isOpen,
  onClose,
  listId,
  listName,
  existingTmdbIds,
  onItemsAdded,
}: LibrarySelectSheetProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const debouncedQuery = useDebounce(query, 200);

  // Fetch library items when sheet opens or filters change
  useEffect(() => {
    if (!isOpen) return;

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        // Fetch from multiple endpoints based on status filter
        const endpoints = statusFilter === 'all'
          ? ['/api/watchlist', '/api/watching', '/api/watched']
          : [`/api/${statusFilter === 'finished' ? 'watched' : statusFilter}`];

        const results = await Promise.all(
          endpoints.map(async (endpoint) => {
            const res = await fetch(endpoint);
            if (res.ok) {
              const data = await res.json();
              return data.items || [];
            }
            return [];
          })
        );

        // Combine and dedupe by media_id
        const allItems = results.flat();
        const uniqueItems = Array.from(
          new Map(allItems.map((item: LibraryItem) => [item.media_id, item])).values()
        ) as LibraryItem[];

        setItems(uniqueItems);
      } catch (error) {
        console.error('Error fetching library:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [isOpen, statusFilter]);

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setStatusFilter('all');
      setTypeFilter('all');
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Filter items based on search query and type
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter(item => item.media_type === typeFilter);
    }

    // Filter by search query
    if (debouncedQuery.trim()) {
      const search = debouncedQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(search)
      );
    }

    // Filter out items already in the list
    result = result.filter(item => !existingTmdbIds.has(item.media_id));

    return result;
  }, [items, typeFilter, debouncedQuery, existingTmdbIds]);

  const toggleSelection = useCallback((tmdbId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(tmdbId)) {
        next.delete(tmdbId);
      } else {
        next.add(tmdbId);
      }
      return next;
    });
  }, []);

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;

    setIsAdding(true);
    try {
      // Get the selected items' details
      const selectedItems = items.filter(item => selectedIds.has(item.media_id));

      // Add each item to the list
      const results = await Promise.all(
        selectedItems.map(async (item) => {
          const res = await fetch(`/api/lists/${listId}/pins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tmdbId: item.media_id,
              mediaType: item.media_type,
              title: item.title,
              posterPath: item.poster_path,
              pinType: 'include',
            }),
          });
          return res.ok;
        })
      );

      const successCount = results.filter(Boolean).length;
      if (successCount > 0) {
        showSuccess(`Added ${successCount} item${successCount > 1 ? 's' : ''} to "${listName}"`);
        onItemsAdded();
        onClose();
      } else {
        showError('Failed to add items');
      }
    } catch (error) {
      showError('Failed to add items');
    } finally {
      setIsAdding(false);
    }
  };

  const isInList = (tmdbId: number) => existingTmdbIds.has(tmdbId);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="px-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Add from Library</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full bg-zinc-800 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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

        {/* Status Tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              typeFilter === 'all'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('movie')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
              typeFilter === 'movie'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            onClick={() => setTypeFilter('tv')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
              typeFilter === 'tv'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            TV Shows
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[40vh] overflow-y-auto">
        {/* Loading */}
        {isLoading && (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="py-8 text-center text-gray-400">
            {items.length === 0 ? (
              <p>Your library is empty</p>
            ) : existingTmdbIds.size > 0 && filteredItems.length === 0 ? (
              <p>All matching items are already in this list</p>
            ) : (
              <p>No items match your filters</p>
            )}
          </div>
        )}

        {/* Items List */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="py-2">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);
              const alreadyInList = isInList(item.media_id);

              return (
                <button
                  key={item.media_id}
                  onClick={() => !alreadyInList && toggleSelection(item.media_id)}
                  disabled={alreadyInList}
                  className={`w-full flex items-center gap-3 px-4 py-2 transition ${
                    alreadyInList
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    {alreadyInList ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : isSelected ? (
                      <CheckSquare className="w-5 h-5 text-brand-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  {/* Poster */}
                  <div className="relative w-10 h-14 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                    {item.poster_path ? (
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
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
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-gray-400">
                      {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                      {item.release_year && ` • ${item.release_year}`}
                      {item.rating && ` • ${item.rating}★`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <button
            onClick={handleAddSelected}
            disabled={isAdding}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
