'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  Grid3X3,
  List,
  Loader2,
  MoreVertical,
  Users,
  Settings,
  Trash2,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';
import EditListModal from '@/components/custom-lists/EditListModal';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import SortFilterBar, { SortOption, sortItems, filterItems } from '@/components/SortFilterBar';
import LibraryFilterSheet, { LibraryFilters, DEFAULT_LIBRARY_FILTERS, countActiveFilters } from '@/components/library/LibraryFilterSheet';
import { ListVisibilityBadge, ListVisibilitySheet } from '@/components/sharing';
import { getImageUrl } from '@/lib/tmdb';

interface CustomList {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_shared: boolean;
  item_count?: number;
}

interface ListItem {
  id: number;
  media_id: number;
  title: string;
  poster_path: string;
  media_type: string;
  tmdb_id: number;
  added_by_name?: string;
  added_at: string;
  added_date?: string; // Alias for sorting compatibility
  rating?: number;
}

type LayoutType = 'list' | 'grid';

export default function CustomListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutType>('list');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isVisibilitySheetOpen, setIsVisibilitySheetOpen] = useState(false);

  // Manage mode state
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  // Apply filters, search, and sort to items
  const filteredItems = useMemo(() => {
    // Map added_at to added_date for sorting compatibility
    let result = items.map(item => ({
      ...item,
      added_date: item.added_at || item.added_date,
    }));

    // Type filter
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

    // Search filter
    const searched = filterItems(result, searchQuery);
    return sortItems(searched, sortBy);
  }, [items, filters, searchQuery, sortBy]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchList();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, slug]);

  const fetchList = async () => {
    try {
      const response = await fetch(`/api/custom-lists/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/lists');
        }
        return;
      }

      const data = await response.json();
      setList(data.list);
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (mediaId: number) => {
    setRemovingId(mediaId);
    try {
      const response = await fetch(`/api/custom-lists/${slug}/items?mediaId=${mediaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => item.media_id !== mediaId));
        if (list) {
          setList({ ...list, item_count: (list.item_count || 1) - 1 });
        }
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleListUpdated = (updatedList: CustomList) => {
    setList(updatedList);
  };

  const handleListDeleted = () => {
    router.push('/lists');
  };

  // Manage mode handlers
  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
    setSelectedIds(new Set());
  };

  const toggleSelect = (mediaId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId);
    } else {
      newSelected.add(mediaId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map(i => i.media_id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/custom-lists/${slug}/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setItems(items.filter(i => !selectedIds.has(i.media_id)));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        if (list) {
          setList({ ...list, item_count: (list.item_count || selectedIds.size) - selectedIds.size });
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin-fast text-gray-400" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <div className="text-center">
          <h2 className="text-2xl mb-2">List not found</h2>
          <Link href="/lists" className="text-brand-primary hover:underline">
            Back to Lists
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = getIconComponent(list.icon);
  const colorValue = getColorValue(list.color);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colorValue }}
          >
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{list.name}</h1>
              {list.is_shared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-xs font-medium rounded-full">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">{items.length} items</p>
              <ListVisibilityBadge
                listType="custom"
                listId={list.id}
                onOpenSheet={() => setIsVisibilitySheetOpen(true)}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleManageMode}
              className={`p-2 rounded-full transition ${
                isManageMode ? 'bg-brand-primary text-white' : 'hover:bg-zinc-800 text-gray-400'
              }`}
              title={isManageMode ? 'Exit manage mode' : 'Manage list'}
            >
              {isManageMode ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setLayout('list')}
                className={`p-2 rounded-md transition ${
                  layout === 'list' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayout('grid')}
                className={`p-2 rounded-md transition ${
                  layout === 'grid' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Description */}
      {list.description && (
        <div className="px-4 py-2">
          <p className="text-sm text-gray-400">{list.description}</p>
        </div>
      )}

      <main className="px-4">
        {/* Search and Filter Bar */}
        {items.length > 0 && (
          <SortFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchQuery ? filteredItems.length : undefined}
            placeholder="Search this list..."
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={countActiveFilters(filters) + (sortBy !== 'added-desc' ? 1 : 0)}
          />
        )}

        {/* Selection Controls (in manage mode) */}
        {isManageMode && filteredItems.length > 0 && (
          <div className="flex items-center justify-between text-sm mb-4 py-2 border-b border-zinc-800">
            <span className="text-gray-400">
              {filteredItems.length} items
              {selectedIds.size > 0 && <span className="text-white"> · {selectedIds.size} selected</span>}
            </span>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 ? (
                <button onClick={deselectAll} className="text-gray-400 hover:text-white">
                  Deselect all
                </button>
              ) : (
                <button onClick={selectAll} className="text-gray-400 hover:text-white">
                  Select all
                </button>
              )}
            </div>
          </div>
        )}

        {filteredItems.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No results found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-brand-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">This list is empty</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-light rounded-lg transition"
            >
              Search for content to add
            </Link>
          </div>
        ) : layout === 'list' ? (
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);
              return (
                <div
                  key={item.id}
                  onClick={isManageMode ? () => toggleSelect(item.media_id) : undefined}
                  className={`flex items-center gap-3 p-2 rounded-lg transition ${
                    isManageMode ? 'cursor-pointer' : ''
                  } ${isSelected ? 'bg-brand-primary/20 ring-1 ring-brand-primary' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  {/* Checkbox (manage mode) */}
                  {isManageMode && (
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-brand-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  )}

                  {isManageMode ? (
                    <>
                      <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                        <Image
                          src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.title}</h3>
                        <p className="text-xs text-gray-400 capitalize">
                          {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/${item.media_type}/${item.tmdb_id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                          <Image
                            src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{item.title}</h3>
                          <p className="text-xs text-gray-400 capitalize">
                            {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                            {item.added_by_name && ` • Added by ${item.added_by_name}`}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsSheetOpen(true);
                          }}
                          className="p-2 hover:bg-zinc-700 rounded-lg transition text-gray-400"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.media_id)}
                          disabled={removingId === item.media_id}
                          className="p-2 hover:bg-zinc-700 rounded-lg transition text-gray-400 hover:text-red-400 disabled:opacity-50"
                        >
                          {removingId === item.media_id ? (
                            <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);

              if (isManageMode) {
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.media_id)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'ring-2 ring-brand-primary rounded-lg' : ''
                    }`}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-[1]">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-primary bg-black rounded" />
                        ) : (
                          <Square className="w-5 h-5 text-white/60 bg-black/50 rounded" />
                        )}
                      </div>
                      <Image
                        src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                        alt={item.title}
                        fill
                        className={`object-cover ${isSelected ? 'opacity-80' : ''}`}
                        sizes="33vw"
                      />
                    </div>
                    <h3 className="mt-2 text-sm font-medium line-clamp-2">{item.title}</h3>
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={`/${item.media_type}/${item.tmdb_id}`}
                  className="group"
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                    <Image
                      src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:opacity-75 transition"
                      sizes="33vw"
                    />
                  </div>
                  <h3 className="mt-2 text-sm font-medium line-clamp-2">{item.title}</h3>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit List Modal */}
      <EditListModal
        isOpen={isEditOpen}
        list={list}
        onClose={() => setIsEditOpen(false)}
        onUpdated={handleListUpdated}
        onDeleted={handleListDeleted}
      />

      {/* Media Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.tmdb_id}
          mediaType={selectedItem.media_type as 'movie' | 'tv'}
          title={selectedItem.title}
          posterPath={selectedItem.poster_path}
        />
      )}

      {/* Library Filter Sheet */}
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

      {/* Fixed Action Bar - rendered via portal to escape transformed container */}
      {portalMounted && isManageMode && selectedIds.size > 0 && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[100]">
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-20 px-4">
            <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm text-white">{selectedIds.size} selected</span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition text-white"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove from List
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal - rendered via portal */}
      {portalMounted && showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 text-white">Remove {selectedIds.size} items?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will remove these items from &quot;{list?.name}&quot;. The items will still be in your main library.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* List Visibility Sheet */}
      <ListVisibilitySheet
        isOpen={isVisibilitySheetOpen}
        onClose={() => setIsVisibilitySheetOpen(false)}
        listType="custom"
        listId={list.id}
        listName={list.name}
      />
    </div>
  );
}
