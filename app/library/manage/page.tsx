'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import ManageListView, { ManageableItem } from '@/components/library/ManageListView';
import SortFilterBar, { SortOption, sortItems, filterItems } from '@/components/SortFilterBar';
import LibraryFilterSheet, { LibraryFilters, DEFAULT_LIBRARY_FILTERS, countActiveFilters } from '@/components/library/LibraryFilterSheet';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'finished', label: 'Finished' },
  { value: 'onhold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

const KIDS_GENRES = [10762, 10751, 16]; // Kids, Family, Animation

const isKidsContent = (genreIds: string | null): boolean => {
  if (!genreIds) return false;
  const genres = genreIds.split(',').map(Number);
  return genres.some((g) => KIDS_GENRES.includes(g));
};

export default function LibraryManagePage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ManageableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search, sort, and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchItems();
    }
  }, [authStatus, router]);

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

  // Apply filters, search, and sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Status filter
    if (statusFilter) {
      result = result.filter(item => item.status === statusFilter);
    }

    // Media type filter
    if (filters.mediaType === 'movie') {
      result = result.filter(item => item.media_type === 'movie');
    } else if (filters.mediaType === 'tv') {
      result = result.filter(item => item.media_type === 'tv');
    }

    // Rating filter
    if (filters.minRating !== null) {
      result = result.filter(item => item.rating && item.rating >= filters.minRating!);
    }
    if (filters.maxRating !== null) {
      result = result.filter(item => item.rating && item.rating <= filters.maxRating!);
    }

    // Kids content filter
    if (filters.kidsContent === 'kids') {
      result = result.filter(item => isKidsContent(item.genre_ids));
    } else if (filters.kidsContent === 'exclude') {
      result = result.filter(item => !isKidsContent(item.genre_ids));
    }

    // Search and sort
    const searched = filterItems(result, searchQuery);
    return sortItems(searched, sortBy);
  }, [items, statusFilter, filters, searchQuery, sortBy]);

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
    setIsSelectMode(newState);
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

  const activeFilterCount = countActiveFilters(filters) + (statusFilter ? 1 : 0);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">All Items</h1>
            <p className="text-xs text-gray-400">{items.length} items total</p>
          </div>
        </div>
      </header>

      {/* Search, Filter Bar */}
      <div className="px-4">
        <SortFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterOpen(true)}
          filterCount={activeFilterCount + (sortBy !== 'added-desc' ? 1 : 0)}
          resultCount={searchQuery ? filteredItems.length : undefined}
          placeholder="Search your library..."
          isSelectMode={isSelectMode}
          onSelectModeChange={handleSelectModeChange}
        />

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                statusFilter === option.value
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manage List View */}
      <ManageListView
        items={filteredItems}
        showStatus={true}
        isSelectMode={isSelectMode}
        onDelete={handleDelete}
        onMove={handleMove}
        onRefresh={fetchItems}
        searchQuery=""
        onSearchChange={() => {}}
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
    </div>
  );
}
