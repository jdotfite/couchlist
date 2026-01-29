'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Plus, Check } from 'lucide-react';
import ManageListView, { ManageableItem } from '@/components/library/ManageListView';
import SortFilterBar, { SortOption, LayoutOption, sortItems, filterItems } from '@/components/SortFilterBar';
import LibraryFilterSheet, { LibraryFilters, DEFAULT_LIBRARY_FILTERS, countActiveFilters } from '@/components/library/LibraryFilterSheet';
import { showSuccess, showError } from '@/lib/toast';

interface ListInfo {
  id: number;
  name: string;
  slug: string;
}

export default function LibraryManagePage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for addToList mode
  const addToListId = searchParams.get('addToList');
  const isAddToListMode = !!addToListId;

  const [items, setItems] = useState<ManageableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [existingTmdbIds, setExistingTmdbIds] = useState<Set<number>>(new Set());
  const [addedCount, setAddedCount] = useState(0);

  // Get type filter from URL params
  const typeParam = searchParams.get('type');
  const initialMediaType = typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all';

  // Search, sort, filters, and layout
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const [filters, setFilters] = useState<LibraryFilters>({
    ...DEFAULT_LIBRARY_FILTERS,
    mediaType: initialMediaType,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(isAddToListMode);
  const [layout, setLayout] = useState<LayoutOption>('grid');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchItems();
      if (isAddToListMode && addToListId) {
        fetchListInfo(parseInt(addToListId, 10));
      }
    }
  }, [authStatus, router, isAddToListMode, addToListId]);

  const fetchListInfo = async (listId: number) => {
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        const data = await res.json();
        const list = data.lists.find((l: ListInfo) => l.id === listId);
        if (list) {
          setListInfo(list);
          // Also fetch existing items in the list
          const itemsRes = await fetch(`/api/lists/${listId}/items`);
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            const tmdbIds = new Set<number>((itemsData.items || []).map((item: { tmdbId: number }) => item.tmdbId));
            setExistingTmdbIds(tmdbIds);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch list info:', error);
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/library/bulk');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // For addToList mode, filter out items already in the list
  const availableItems = useMemo(() => {
    if (!isAddToListMode) return items;
    return items.filter(item => !existingTmdbIds.has(item.tmdb_id));
  }, [items, isAddToListMode, existingTmdbIds]);

  // Apply filters, search, and sort
  const filteredItems = useMemo(() => {
    let result = [...availableItems];

    // Media type filter
    if (filters.mediaType === 'movie') {
      result = result.filter(item => item.media_type === 'movie');
    } else if (filters.mediaType === 'tv') {
      result = result.filter(item => item.media_type === 'tv');
    }

    // Genre filter
    if (filters.genres.length > 0) {
      result = result.filter(item => {
        if (!item.genre_ids) return false;
        const itemGenres = item.genre_ids.split(',').map(Number);
        return filters.genres.some(g => itemGenres.includes(g));
      });
    }

    // Rating filter
    if (filters.minRating !== null) {
      result = result.filter(item => item.rating && item.rating >= filters.minRating!);
    }
    if (filters.maxRating !== null) {
      result = result.filter(item => item.rating && item.rating <= filters.maxRating!);
    }

    // Year filter
    if (filters.minYear !== null) {
      result = result.filter(item => item.release_year && item.release_year >= filters.minYear!);
    }
    if (filters.maxYear !== null) {
      result = result.filter(item => item.release_year && item.release_year <= filters.maxYear!);
    }

    // Search and sort
    const searched = filterItems(result, searchQuery);
    return sortItems(searched, sortBy);
  }, [availableItems, filters, searchQuery, sortBy]);

  const handleDelete = async (mediaIds: number[]) => {
    const res = await fetch('/api/library/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds }),
    });
    if (!res.ok) throw new Error('Failed to delete');
  };

  const handleMove = async (mediaIds: number[], targetStatus: string) => {
    const res = await fetch('/api/library/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds, newStatus: targetStatus }),
    });
    if (!res.ok) throw new Error('Failed to move');
  };

  const handleSelectModeChange = (newState: boolean) => {
    // Don't allow disabling select mode in addToList mode
    if (isAddToListMode && !newState) return;
    setIsSelectMode(newState);
  };

  const handleAddToList = async () => {
    if (selectedIds.size === 0 || !listInfo) return;

    setIsAddingToList(true);
    try {
      // Get the selected items' details
      const selectedItems = items.filter(item => selectedIds.has(item.media_id));

      // Add each item to the list
      const results = await Promise.all(
        selectedItems.map(async (item) => {
          const res = await fetch(`/api/lists/${listInfo.id}/pins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tmdbId: item.tmdb_id,
              mediaType: item.media_type,
              title: item.title,
              posterPath: item.poster_path,
              pinType: 'include',
            }),
          });
          return { ok: res.ok, tmdbId: item.tmdb_id };
        })
      );

      const successfulItems = results.filter(r => r.ok);
      const successCount = successfulItems.length;

      if (successCount > 0) {
        showSuccess(`Added ${successCount} item${successCount > 1 ? 's' : ''} to "${listInfo.name}"`);
        // Update added count
        setAddedCount(prev => prev + successCount);
        // Add to existing IDs so they're filtered out of available items
        setExistingTmdbIds(prev => {
          const newSet = new Set(prev);
          successfulItems.forEach(item => newSet.add(item.tmdbId));
          return newSet;
        });
        // Clear selection
        setSelectedIds(new Set());
      } else {
        showError('Failed to add items');
      }
    } catch (error) {
      showError('Failed to add items');
    } finally {
      setIsAddingToList(false);
    }
  };

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <header className="sticky top-0 z-20 bg-black px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">All Items</h1>
          </div>
        </header>
        <main className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </main>
      </div>
    );
  }

  const activeFilterCount = countActiveFilters(filters) + (sortBy !== 'added-desc' ? 1 : 0);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={isAddToListMode && listInfo ? `/lists/${listInfo.slug}` : '/library'}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              {isAddToListMode ? 'Select Items' : 'All Items'}
            </h1>
            <p className="text-xs text-gray-400">
              {isAddToListMode && listInfo
                ? `Adding to "${listInfo.name}"`
                : `${items.length} items total`}
            </p>
          </div>
        </div>
      </header>

      {/* Search, Filter Bar */}
      <div className="px-4">
        <SortFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterOpen(true)}
          filterCount={activeFilterCount}
          resultCount={searchQuery ? filteredItems.length : undefined}
          placeholder="Search your library..."
          layout={layout}
          onLayoutChange={setLayout}
          isSelectMode={isSelectMode}
          onSelectModeChange={handleSelectModeChange}
        />
      </div>

      {/* Manage List View */}
      <ManageListView
        items={filteredItems}
        layout={layout}
        showStatus={true}
        isSelectMode={isSelectMode}
        onDelete={handleDelete}
        onMove={handleMove}
        onRefresh={fetchItems}
        searchQuery=""
        onSearchChange={() => {}}
        onSelectionChange={isAddToListMode ? setSelectedIds : undefined}
        hideDefaultActions={isAddToListMode}
      />

      {/* Filter Sheet */}
      <LibraryFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onApply={() => setIsFilterOpen(false)}
        resultCount={filteredItems.length}
      />

      {/* Add to List Action Bar - always visible in addToList mode */}
      {isAddToListMode && listInfo && (
        <div className="fixed inset-x-0 bottom-0 z-[100]">
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-20 px-4">
            <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
              {selectedIds.size > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={handleAddToList}
                    disabled={isAddingToList}
                    className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAddingToList ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add to List
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {addedCount > 0 && (
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {addedCount > 0
                          ? `${addedCount} item${addedCount > 1 ? 's' : ''} added`
                          : 'Select items to add'
                        }
                      </p>
                      <p className="text-xs text-gray-400">{listInfo.name}</p>
                    </div>
                  </div>
                  <Link
                    href={`/lists/${listInfo.slug}`}
                    className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium text-sm transition"
                  >
                    Done
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
