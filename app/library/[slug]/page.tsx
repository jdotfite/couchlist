'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MoreVertical, CheckCircle2, Heart, Clock, Play, PauseCircle, XCircle, RotateCcw, Sparkles, Star, ChevronLeft, Film, Tv, Square, CheckSquare, Trash2, ArrowRightLeft, Loader2, Eye, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import EmptyState from '@/components/EmptyState';
import MediaListSkeleton from '@/components/MediaListSkeleton';
import SortFilterBar, { SortOption, LayoutOption, sortItems, filterItems } from '@/components/SortFilterBar';
import LibraryFilterSheet, { LibraryFilters, DEFAULT_LIBRARY_FILTERS, countActiveFilters } from '@/components/library/LibraryFilterSheet';
import { ListVisibilityBadge } from '@/components/sharing/ListVisibilityBadge';
import { ListVisibilitySheet } from '@/components/sharing/ListVisibilitySheet';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences } from '@/hooks/useListPreferences';

const KIDS_GENRES = [10762, 10751, 16]; // Kids, Family, Animation

interface ListItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  genre_ids?: string | null;
  added_date?: string;
  watched_date?: string;
  rating?: number;
  is_favorite?: boolean;
}



type IconType = 'finished' | 'watchlist' | 'watching' | 'onhold' | 'dropped' | 'rewatch' | 'classics' | 'favorites';

const listConfig: Record<string, { title: string; subtitle: string; apiEndpoint: string; icon: React.ReactNode; iconType: IconType; emptyMessage: string; emptySubMessage: string }> = {
  finished: {
    title: 'Watched',
    subtitle: 'Movies and shows you\'ve completed',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-brand-primary" />,
    iconType: 'finished',
    emptyMessage: 'Nothing watched yet',
    emptySubMessage: 'Mark movies and shows as watched to track them here',
  },
  watched: {
    title: 'Watched',
    subtitle: 'Movies and shows you\'ve completed',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-brand-primary" />,
    iconType: 'finished',
    emptyMessage: 'Nothing watched yet',
    emptySubMessage: 'Mark movies and shows as watched to track them here',
  },
  watching: {
    title: 'Watching',
    subtitle: 'In progress right now',
    apiEndpoint: '/api/watching',
    icon: <Play className="w-6 h-6 text-green-500" />,
    iconType: 'watching',
    emptyMessage: 'Nothing in progress yet',
    emptySubMessage: 'Add movies and shows you are watching',
  },
  watchlist: {
    title: 'Watchlist',
    subtitle: 'Movies and shows you want to watch',
    apiEndpoint: '/api/watchlist',
    icon: <Clock className="w-6 h-6 text-blue-500" />,
    iconType: 'watchlist',
    emptyMessage: 'Your watchlist is empty',
    emptySubMessage: 'Add movies and shows you want to watch',
  },
  onhold: {
    title: 'On Hold',
    subtitle: 'Paused for later',
    apiEndpoint: '/api/onhold',
    icon: <PauseCircle className="w-6 h-6 text-yellow-500" />,
    iconType: 'onhold',
    emptyMessage: 'Nothing on hold yet',
    emptySubMessage: 'Add movies and shows you paused',
  },
  dropped: {
    title: 'Dropped',
    subtitle: 'Titles you stopped watching',
    apiEndpoint: '/api/dropped',
    icon: <XCircle className="w-6 h-6 text-red-500" />,
    iconType: 'dropped',
    emptyMessage: 'Nothing dropped yet',
    emptySubMessage: 'Add movies and shows you stopped',
  },
  rewatch: {
    title: 'Rewatch',
    subtitle: 'Worth another pass',
    apiEndpoint: '/api/rewatch',
    icon: <RotateCcw className="w-6 h-6 text-cyan-500" />,
    iconType: 'rewatch',
    emptyMessage: 'Nothing queued to rewatch',
    emptySubMessage: 'Add movies and shows you want to revisit',
  },
  nostalgia: {
    title: 'Classics',
    subtitle: 'Childhood favorites and throwbacks',
    apiEndpoint: '/api/nostalgia',
    icon: <Sparkles className="w-6 h-6 text-amber-500" />,
    iconType: 'classics',
    emptyMessage: 'No nostalgic titles yet',
    emptySubMessage: 'Add movies and shows from your past',
  },
  favorites: {
    title: 'Favorites',
    subtitle: 'Your all-time favorites',
    apiEndpoint: '/api/favorites',
    icon: <Heart className="w-6 h-6 text-pink-500" />,
    iconType: 'favorites',
    emptyMessage: 'No favorites yet',
    emptySubMessage: 'Add your favorite movies and shows',
  },
};

export default function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getListName } = useListPreferences();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutOption>('grid');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Manage mode state
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showMoveSheet, setShowMoveSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  // Visibility sheet state
  const [isVisibilitySheetOpen, setIsVisibilitySheetOpen] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  const config = listConfig[slug];

  // Status lists are mutually exclusive
  const STATUS_LISTS = ['watchlist', 'watching', 'onhold', 'dropped', 'finished', 'watched'];
  // Tag lists can be combined with any status
  const TAG_LISTS = ['favorites', 'rewatch', 'nostalgia'];
  const isTagList = TAG_LISTS.includes(slug);

  // Get display name from preferences or fallback to config
  const displayName = getListName(slug) || config?.title || slug;

  // Helper to check if item is kids content
  const isKidsContent = (item: ListItem): boolean => {
    if (!item.genre_ids) return false;
    const genres = item.genre_ids.split(',').map(Number);
    return genres.some((g) => KIDS_GENRES.includes(g));
  };

  // Filter, search, and sort items
  const filteredItems = useMemo(() => {
    let result = items;

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

    // Kids content filter
    if (filters.kidsContent === 'kids') {
      result = result.filter(item => isKidsContent(item));
    } else if (filters.kidsContent === 'exclude') {
      result = result.filter(item => !isKidsContent(item));
    }

    // Search filter
    result = filterItems(result, searchQuery);

    // Sort
    return sortItems(result, sortBy);
  }, [items, filters, searchQuery, sortBy]);

  useEffect(() => {
    if (status === 'authenticated' && config) {
      fetchItems();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, slug]);

  const fetchItems = async () => {
    if (!config) return;

    try {
      const response = await fetch(config.apiEndpoint);
      if (response.ok) {
        const data = await response.json();
        // Handle different response formats
        setItems(
          data.items ||
          data.favorites ||
          data.watched ||
          data.watchlist ||
          data.watching ||
          data.onhold ||
          data.dropped ||
          data.rewatch ||
          data.nostalgia ||
          []
        );
      }
    } catch (error) {
      console.error(`Failed to fetch ${slug}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Callback when item is removed from current list via the sheet
  const handleRemove = () => {
    if (!selectedItem) return;
    setItems(items.filter(item =>
      !(item.media_id === selectedItem.media_id && item.media_type === selectedItem.media_type)
    ));
  };

  // Callback when item status changes (moved to different list)
  const handleStatusChange = (newStatus: string) => {
    if (!selectedItem) return;
    // If we're on a status list and item moved to a different status, remove from view
    if (STATUS_LISTS.includes(slug) && STATUS_LISTS.includes(newStatus) && slug !== newStatus) {
      setItems(items.filter(i =>
        !(i.media_id === selectedItem.media_id && i.media_type === selectedItem.media_type)
      ));
    }
  };

  // Callback when a tag is toggled
  const handleTagToggle = (tag: string, added: boolean) => {
    if (!selectedItem) return;
    // If we're viewing a tag list and the tag was removed, remove item from view
    if (isTagList && slug === tag && !added) {
      setItems(items.filter(i =>
        !(i.media_id === selectedItem.media_id && i.media_type === selectedItem.media_type)
      ));
    }
  };

  const openOptionsSheet = (item: ListItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  // Manage mode handlers
  const toggleManageMode = (newState?: boolean) => {
    const newMode = newState !== undefined ? newState : !isManageMode;
    setIsManageMode(newMode);
    if (!newMode) {
      setSelectedIds(new Set());
    }
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
      const res = await fetch('/api/library/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setItems(items.filter(i => !selectedIds.has(i.media_id)));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkMove = async (targetStatus: string) => {
    if (selectedIds.size === 0) return;
    setIsMoving(true);
    try {
      const res = await fetch('/api/library/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds), newStatus: targetStatus }),
      });
      if (res.ok) {
        // Remove moved items from current view (they're now in a different list)
        setItems(items.filter(i => !selectedIds.has(i.media_id)));
        setSelectedIds(new Set());
        setShowMoveSheet(false);
      }
    } catch (error) {
      console.error('Failed to move:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const STATUS_OPTIONS = [
    { value: 'watchlist', label: 'Watchlist', color: 'bg-blue-500' },
    { value: 'watching', label: 'Watching', color: 'bg-emerald-500' },
    { value: 'finished', label: 'Watched', color: 'bg-purple-500' },
  ];

  // Available move targets (exclude current list)
  const moveTargets = STATUS_OPTIONS.filter(o => o.value !== slug);

  if (!config) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <div className="text-center">
          <h2 className="text-2xl mb-2">List not found</h2>
          <Link href="/library" className="text-blue-500 hover:underline">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  if (!session?.user && status !== 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <div className="text-center">
          <h2 className="text-2xl mb-2">Sign in to view your {config.title.toLowerCase()}</h2>
          <p className="text-gray-400">{config.subtitle}</p>
        </div>
      </div>
    );
  }

  if (status === 'loading' || isLoading) {
    return <MediaListSkeleton layout={layout} />;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/library')}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{displayName}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{items.length} items</span>
              <span className="text-gray-600">•</span>
              <ListVisibilityBadge
                listType={slug}
                onOpenSheet={() => setIsVisibilitySheetOpen(true)}
              />
            </div>
          </div>
        </div>

      </header>

      <main className="px-4">
        {/* Search and Filter Bar */}
        {items.length > 0 && (
          <SortFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchQuery ? filteredItems.length : undefined}
            placeholder={`Search ${displayName.toLowerCase()}...`}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={countActiveFilters(filters) + (sortBy !== 'added-desc' ? 1 : 0)}
            layout={layout}
            onLayoutChange={setLayout}
            isSelectMode={isManageMode}
            onSelectModeChange={toggleManageMode}
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
        ) : filteredItems.length === 0 ? (
          <EmptyState
            iconType={config.iconType}
            title={items.length === 0 ? config.emptyMessage : `No ${filters.mediaType === 'movie' ? 'movies' : filters.mediaType === 'tv' ? 'TV shows' : 'items'} match your filters`}
            subtitle={items.length === 0 ? config.emptySubMessage : 'Try changing the filter'}
            actionLabel={items.length === 0 ? "Search" : undefined}
            actionHref={items.length === 0 ? "/search" : undefined}
          />
        ) : layout === 'list' ? (
          /* List View */
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);
              return (
                <div
                  key={item.id}
                  onClick={isManageMode ? () => toggleSelect(item.media_id) : undefined}
                  className={`flex items-center gap-3 p-2 rounded-lg transition group ${
                    isManageMode ? 'cursor-pointer' : ''
                  } ${isSelected ? 'bg-brand-primary/20 ring-1 ring-brand-primary' : 'hover:bg-zinc-900'}`}
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

                  {/* Poster */}
                  {isManageMode ? (
                    <div className="relative w-14 h-20 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : (
                    <Link
                      href={`/${item.media_type}/${item.media_id}`}
                      className="relative w-14 h-20 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800"
                    >
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                        {item.media_type === 'movie' ? (
                          <Film className="w-3 h-3 text-white" />
                        ) : (
                          <Tv className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </Link>
                  )}

                  {/* Info */}
                  {isManageMode ? (
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                      </p>
                    </div>
                  ) : (
                    <Link
                      href={`/${item.media_type}/${item.media_id}`}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                      <p className="text-xs text-gray-400 capitalize">
                        {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                      </p>
                    </Link>
                  )}

                  {/* Favorite Indicator */}
                  {item.is_favorite && !isManageMode && (
                    <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
                  )}

                  {/* Options Button (not in manage mode) */}
                  {!isManageMode && (
                    <button
                      onClick={() => openOptionsSheet(item)}
                      className="p-2 text-gray-400 hover:text-white transition"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);
              return (
                <div
                  key={item.id}
                  className={`group relative ${isManageMode ? 'cursor-pointer' : ''} ${
                    isSelected ? 'ring-2 ring-brand-primary rounded-lg' : ''
                  }`}
                  onClick={isManageMode ? () => toggleSelect(item.media_id) : undefined}
                >
                  {isManageMode ? (
                    <div className="relative aspect-[2/3] mb-2 overflow-hidden rounded-lg bg-zinc-800">
                      {/* Checkbox */}
                      <div className="absolute top-2 left-2 z-[1]">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-primary bg-black rounded" />
                        ) : (
                          <Square className="w-5 h-5 text-white/60 bg-black/50 rounded" />
                        )}
                      </div>
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
                        fill
                        className={`object-cover ${isSelected ? 'opacity-80' : ''}`}
                        sizes="33vw"
                      />
                    </div>
                  ) : (
                    <Link href={`/${item.media_type}/${item.media_id}`}>
                      <div className="relative aspect-[2/3] mb-2 overflow-hidden rounded-lg bg-zinc-800">
                        <Image
                          src={getImageUrl(item.poster_path)}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="33vw"
                        />
                        <div className="absolute top-2 left-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                          {item.media_type === 'movie' ? (
                            <Film className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Tv className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </div>
                    </Link>
                  )}

                  <h3 className="font-semibold text-xs line-clamp-2 leading-tight">
                    {item.title}
                  </h3>

                  {item.is_favorite && !isManageMode && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                      <Heart className="w-3.5 h-3.5 text-pink-500" />
                    </div>
                  )}

                  {/* Options Button (visible on hover, not in manage mode) */}
                  {!isManageMode && (
                    <button
                      onClick={() => openOptionsSheet(item)}
                      className="absolute bottom-12 right-1 w-7 h-7 bg-black/75 hover:bg-zinc-700 backdrop-blur-sm rounded-full flex items-center justify-center transition z-10 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.media_id}
          mediaType={selectedItem.media_type as 'movie' | 'tv'}
          title={selectedItem.title}
          posterPath={selectedItem.poster_path}
          onStatusChange={handleStatusChange}
          onTagToggle={handleTagToggle}
          onRemove={handleRemove}
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

      {/* Manage Mode Action Bar */}
      {portalMounted && isManageMode && selectedIds.size > 0 && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[100]">
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-20 px-4">
            <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm text-white">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMoveSheet(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition text-white"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Move
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {portalMounted && showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 text-white">Remove {selectedIds.size} items?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will remove these items from your library. This action cannot be undone.
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

      {/* Move Sheet */}
      {portalMounted && showMoveSheet && createPortal(
        <div className="fixed inset-0 z-[110] bg-black/80" onClick={() => setShowMoveSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Move {selectedIds.size} items to...</h2>
                <button
                  onClick={() => setShowMoveSheet(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {moveTargets.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleBulkMove(option.value)}
                    disabled={isMoving}
                    className="w-full flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition disabled:opacity-50 text-white"
                  >
                    <div className={`w-3 h-3 rounded-full ${option.color}`} />
                    <span className="font-medium">{option.label}</span>
                    {isMoving && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* List Visibility Sheet */}
      <ListVisibilitySheet
        isOpen={isVisibilitySheetOpen}
        onClose={() => setIsVisibilitySheetOpen(false)}
        listType={slug}
        listName={displayName}
      />
    </div>
  );
}
