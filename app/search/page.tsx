'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, X, SlidersHorizontal, ChevronLeft, Check } from 'lucide-react';
import SearchResults from '@/components/SearchResults';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import MainHeader from '@/components/ui/MainHeader';
import FilterBottomSheet from '@/components/search/FilterBottomSheet';
import ActiveFilters from '@/components/search/ActiveFilters';
import BrowseCards from '@/components/search/BrowseCards';
import DiscoveryRow from '@/components/search/DiscoveryRow';
import AddRowCard from '@/components/search/AddRowCard';
import AddRowBottomSheet from '@/components/search/AddRowBottomSheet';
import { useDiscoveryRows } from '@/hooks/useDiscoveryRows';
import { Movie, TVShow, SearchResponse } from '@/types';
import { DiscoverFilters, DEFAULT_FILTERS } from '@/types/streaming';

interface TrendingItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

interface DiscoverResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  genre_ids: number[];
}

interface ListInfo {
  id: number;
  name: string;
  slug: string;
}

export default function SearchPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // If navigated with ?focus=1 (from the home fake-search link), focus the input so the user can start typing immediately
  useEffect(() => {
    try {
      if (searchParams.get('focus')) {
        // schedule focus after render to avoid timing issues
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    } catch (err) {
      // searchParams might be null in some environments; fail silently
    }
  }, [searchParams]);

  // Add to list mode
  const addToListId = searchParams.get('addToList');
  const isAddToListMode = !!addToListId;
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [existingTmdbIds, setExistingTmdbIds] = useState<Set<number>>(new Set());
  const [addedCount, setAddedCount] = useState(0);

  // Portal mount state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Movie | TVShow)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<DiscoverResult[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasFiltered, setHasFiltered] = useState(false);

  // Discovery rows
  const {
    rows: discoveryRows,
    loading: rowsLoading,
    availableByCategory,
    addRow,
    removeRow,
    moveRow,
  } = useDiscoveryRows();
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);

  // Media options sheet
  const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Trending content for addToList mode
  const [trendingItems, setTrendingItems] = useState<(Movie | TVShow)[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);

  // Fetch trending when in addToList mode
  useEffect(() => {
    if (!isAddToListMode) return;

    const fetchTrending = async () => {
      setIsTrendingLoading(true);
      try {
        const res = await fetch('/api/trending?type=all');
        if (res.ok) {
          const data = await res.json();
          setTrendingItems(data.results || []);
        }
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setIsTrendingLoading(false);
      }
    };

    fetchTrending();
  }, [isAddToListMode]);

  // Fetch list info when in addToList mode
  useEffect(() => {
    if (!isAddToListMode || !addToListId) return;

    const fetchListInfo = async () => {
      try {
        const listsRes = await fetch('/api/lists');
        if (listsRes.ok) {
          const data = await listsRes.json();
          const list = data.lists.find((l: ListInfo) => l.id === parseInt(addToListId, 10));
          if (list) {
            setListInfo(list);
            // Fetch existing items in the list
            const itemsRes = await fetch(`/api/lists/${list.id}/items`);
            if (itemsRes.ok) {
              const itemsData = await itemsRes.json();
              const tmdbIds = new Set<number>(
                (itemsData.items || []).map((item: { tmdbId: number }) => item.tmdbId)
              );
              setExistingTmdbIds(tmdbIds);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch list info:', error);
      }
    };

    fetchListInfo();
  }, [isAddToListMode, addToListId]);

  // Handler for adding items to list
  const handleAddToList = async (item: Movie | TVShow) => {
    if (!listInfo) return;

    const mediaType = 'title' in item && !('name' in item) ? 'movie' : 'tv';
    const title = 'title' in item ? item.title : (item as TVShow).name;

    const res = await fetch(`/api/lists/${listInfo.id}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId: item.id,
        mediaType,
        title,
        posterPath: item.poster_path,
        pinType: 'include',
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to add item to list');
    }

    // Update existingTmdbIds locally and increment count
    setExistingTmdbIds(prev => new Set(prev).add(item.id));
    setAddedCount(prev => prev + 1);
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setHasFiltered(false);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&type=multi`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse<Movie | TVShow> = await response.json();

      // Apply type filter if set
      let filteredResults = data.results;
      if (filters.type === 'movie') {
        filteredResults = data.results.filter((item: any) => item.media_type === 'movie' || item.title);
      } else if (filters.type === 'tv') {
        filteredResults = data.results.filter((item: any) => item.media_type === 'tv' || item.name);
      }

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Discover content with filters
  const performDiscover = useCallback(async () => {
    setIsDiscovering(true);
    setHasFiltered(true);
    setHasSearched(false);
    setQuery('');

    try {
      const params = new URLSearchParams();

      if (filters.type !== 'all') {
        params.set('type', filters.type);
      }
      if (filters.providers.length > 0) {
        params.set('providers', filters.providers.join(','));
      }
      if (filters.genres.length > 0) {
        params.set('genres', filters.genres.join(','));
      }
      if (filters.yearMin) {
        params.set('yearMin', filters.yearMin.toString());
      }
      if (filters.yearMax) {
        params.set('yearMax', filters.yearMax.toString());
      }
      if (filters.ratingMin) {
        params.set('ratingMin', filters.ratingMin.toString());
      }
      if (filters.runtimeMin) {
        params.set('runtimeMin', filters.runtimeMin.toString());
      }
      if (filters.runtimeMax) {
        params.set('runtimeMax', filters.runtimeMax.toString());
      }
      if (filters.sortBy !== 'popularity.desc') {
        params.set('sortBy', filters.sortBy);
      }

      const response = await fetch(`/api/discover?${params}`);

      if (!response.ok) {
        throw new Error('Discover failed');
      }

      const data = await response.json();
      setDiscoverResults(data.results || []);
    } catch (error) {
      console.error('Discover error:', error);
      setDiscoverResults([]);
    } finally {
      setIsDiscovering(false);
    }
  }, [filters]);

  // Handle provider card click
  const handleProviderClick = (providerId: number) => {
    const newFilters = {
      ...DEFAULT_FILTERS,
      providers: [providerId],
    };
    setFilters(newFilters);
    // Trigger discover with new filter
    setTimeout(() => {
      setIsDiscovering(true);
      setHasFiltered(true);
      setHasSearched(false);
      setQuery('');

      fetch(`/api/discover?providers=${providerId}`)
        .then(res => res.json())
        .then(data => {
          setDiscoverResults(data.results || []);
        })
        .catch(error => {
          console.error('Discover error:', error);
          setDiscoverResults([]);
        })
        .finally(() => {
          setIsDiscovering(false);
        });
    }, 0);
  };

  const handleAddClick = (item: TrendingItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setHasFiltered(false);
    setDiscoverResults([]);
  };

  const hasActiveFilters =
    filters.providers.length > 0 ||
    filters.genres.length > 0 ||
    filters.type !== 'all' ||
    filters.yearMin !== undefined ||
    filters.yearMax !== undefined ||
    filters.ratingMin !== undefined ||
    filters.runtimeMin !== undefined ||
    filters.runtimeMax !== undefined;

  const activeFilterCount =
    filters.providers.length +
    filters.genres.length +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.yearMin || filters.yearMax ? 1 : 0) +
    (filters.ratingMin ? 1 : 0) +
    (filters.runtimeMin || filters.runtimeMax ? 1 : 0);

  // Show browse view when not searching and not filtered (hide in addToList mode)
  const showBrowseView = !isAddToListMode && !hasSearched && !hasFiltered;

  // Convert discover results to the format expected by SearchResults
  const resultsForDisplay = hasFiltered
    ? discoverResults.map(item => ({
        ...item,
        title: item.title || item.name,
        name: item.name || item.title,
      }))
    : searchResults;

  // Shared search input component
  const searchInput = (
    <div className="flex gap-2">
      <div className="relative flex-1">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search movies & TV shows..."
          className="w-full h-12 pl-11 pr-12 bg-zinc-900 rounded-lg border border-transparent text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary transition-all"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filter Button - only show in normal mode */}
      {!isAddToListMode && (
        <button
          onClick={() => setIsFilterOpen(true)}
          className={`relative h-12 px-4 rounded-lg flex items-center gap-2 transition font-medium ${
            hasActiveFilters
              ? 'bg-brand-primary text-white'
              : 'bg-zinc-900 text-gray-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="text-sm">{activeFilterCount}</span>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Custom header for addToList mode */}
      {isAddToListMode ? (
        <header className="sticky top-0 z-10 bg-black px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={listInfo ? `/lists/${listInfo.slug}` : '/library'}
              className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Search to Add</h1>
              {listInfo && (
                <p className="text-sm text-gray-400">Adding to "{listInfo.name}"</p>
              )}
            </div>
          </div>
          {searchInput}
        </header>
      ) : (
        <MainHeader title="Search">
          {searchInput}
        </MainHeader>
      )}

      <main className="px-4">
        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mb-4">
            <ActiveFilters
              filters={filters}
              onRemoveProvider={providerId => {
                const newFilters = {
                  ...filters,
                  providers: filters.providers.filter(id => id !== providerId),
                };
                setFilters(newFilters);
                if (
                  newFilters.providers.length === 0 &&
                  newFilters.genres.length === 0 &&
                  newFilters.type === 'all' &&
                  !newFilters.yearMin &&
                  !newFilters.yearMax &&
                  !newFilters.ratingMin &&
                  !newFilters.runtimeMin &&
                  !newFilters.runtimeMax
                ) {
                  setHasFiltered(false);
                  setDiscoverResults([]);
                } else {
                  performDiscover();
                }
              }}
              onRemoveGenre={genreId => {
                const newFilters = {
                  ...filters,
                  genres: filters.genres.filter(id => id !== genreId),
                };
                setFilters(newFilters);
                if (
                  newFilters.providers.length === 0 &&
                  newFilters.genres.length === 0 &&
                  newFilters.type === 'all' &&
                  !newFilters.yearMin &&
                  !newFilters.yearMax &&
                  !newFilters.ratingMin &&
                  !newFilters.runtimeMin &&
                  !newFilters.runtimeMax
                ) {
                  setHasFiltered(false);
                  setDiscoverResults([]);
                } else {
                  performDiscover();
                }
              }}
              onClearType={() => {
                setFilters(prev => ({ ...prev, type: 'all' }));
                performDiscover();
              }}
              onClearYear={() => {
                setFilters(prev => ({ ...prev, yearMin: undefined, yearMax: undefined }));
                performDiscover();
              }}
              onClearRating={() => {
                setFilters(prev => ({ ...prev, ratingMin: undefined }));
                performDiscover();
              }}
              onClearRuntime={() => {
                setFilters(prev => ({ ...prev, runtimeMin: undefined, runtimeMax: undefined }));
                performDiscover();
              }}
              onClearAll={clearAllFilters}
            />
          </div>
        )}

        {/* Browse View */}
        {showBrowseView && (
          <>
            <BrowseCards onProviderClick={handleProviderClick} />

            {/* Dynamic Discovery Rows */}
            <div className="mt-6 space-y-2">
              {discoveryRows.map((row, index) => (
                <DiscoveryRow
                  key={row.rowType}
                  row={row}
                  isFirst={index === 0}
                  isLast={index === discoveryRows.length - 1}
                  onMoveUp={() => moveRow(row.rowType, 'up')}
                  onMoveDown={() => moveRow(row.rowType, 'down')}
                  onHide={() => removeRow(row.rowType)}
                  onAddClick={handleAddClick}
                />
              ))}

              {/* Add Row Card */}
              {!rowsLoading && (
                <AddRowCard onClick={() => setIsAddRowOpen(true)} />
              )}
            </div>
          </>
        )}

        {/* Add to List Mode - Show trending when no search */}
        {isAddToListMode && !hasSearched && !hasFiltered && (
          <div className="mb-8">
            <p className="text-sm text-gray-400 mb-4">
              Search above or browse popular titles to add to your list
            </p>
            <h2 className="text-lg font-semibold mb-3">Trending Now</h2>
            <SearchResults
              results={trendingItems}
              isLoading={isTrendingLoading}
              addToListId={listInfo?.id}
              addToListName={listInfo?.name}
              existingTmdbIds={existingTmdbIds}
              onAddToList={handleAddToList}
            />
          </div>
        )}

        {/* Search/Discover Results */}
        {(hasSearched || hasFiltered) && (
          <div className="mb-8">
            <SearchResults
              results={resultsForDisplay as (Movie | TVShow)[]}
              isLoading={isSearching || isDiscovering}
              activeProvider={filters.providers.length === 1 ? filters.providers[0] : undefined}
              addToListId={listInfo?.id}
              addToListName={listInfo?.name}
              existingTmdbIds={existingTmdbIds}
              onAddToList={isAddToListMode ? handleAddToList : undefined}
            />
          </div>
        )}
      </main>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={performDiscover}
        resultCount={hasFiltered ? discoverResults.length : undefined}
      />

      {/* Media Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.id}
          mediaType={selectedItem.media_type}
          title={selectedItem.title || selectedItem.name || 'Unknown'}
          posterPath={selectedItem.poster_path || ''}
        />
      )}

      {/* Add Row Bottom Sheet */}
      <AddRowBottomSheet
        isOpen={isAddRowOpen}
        onClose={() => setIsAddRowOpen(false)}
        availableByCategory={availableByCategory}
        addedRows={discoveryRows.map(r => r.rowType)}
        onAddRow={addRow}
      />

      {/* Floating Done Bar for addToList mode */}
      {mounted && isAddToListMode && listInfo && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[100]">
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-20 px-4">
            <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
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
                        : 'Adding to list'
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
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
