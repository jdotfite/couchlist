'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import ManageListView, { ManageableItem } from '@/components/library/ManageListView';
import SortFilterBar, { SortOption, LayoutOption, sortItems, filterItems } from '@/components/SortFilterBar';
import LibraryFilterSheet, { LibraryFilters, DEFAULT_LIBRARY_FILTERS, countActiveFilters } from '@/components/library/LibraryFilterSheet';

export default function LibraryManagePage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ManageableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search, sort, filters, and layout
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [layout, setLayout] = useState<LayoutOption>('grid');

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
  }, [items, filters, searchQuery, sortBy]);

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

  const activeFilterCount = countActiveFilters(filters) + (sortBy !== 'added-desc' ? 1 : 0);

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
