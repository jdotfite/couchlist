'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MoreVertical, Grid3X3, List, CheckCircle2, Heart, Clock, Play, PauseCircle, XCircle, RotateCcw, Sparkles, Star, ChevronLeft, Film, Tv } from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import EmptyState from '@/components/EmptyState';
import MediaListSkeleton from '@/components/MediaListSkeleton';
import SortFilterBar, { SortOption, sortItems, filterItems } from '@/components/SortFilterBar';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences } from '@/hooks/useListPreferences';

interface ListItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  added_date?: string;
  watched_date?: string;
  rating?: number;
  is_favorite?: boolean;
}


type LayoutType = 'list' | 'grid';

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
  const [layout, setLayout] = useState<LayoutType>('grid');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');

  const config = listConfig[slug];

  // Status lists are mutually exclusive
  const STATUS_LISTS = ['watchlist', 'watching', 'onhold', 'dropped', 'finished', 'watched'];
  // Tag lists can be combined with any status
  const TAG_LISTS = ['favorites', 'rewatch', 'nostalgia'];
  const isTagList = TAG_LISTS.includes(slug);

  // Get display name from preferences or fallback to config
  const displayName = getListName(slug) || config?.title || slug;

  // Filter, search, and sort items
  const filteredItems = useMemo(() => {
    let result = items;

    // Type filter
    if (filter === 'movies') {
      result = result.filter(item => item.media_type === 'movie');
    } else if (filter === 'tv') {
      result = result.filter(item => item.media_type === 'tv');
    }

    // Search filter
    result = filterItems(result, searchQuery);

    // Sort
    return sortItems(result, sortBy);
  }, [items, filter, searchQuery, sortBy]);

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
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/library')}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{displayName}</h1>
            <p className="text-xs text-gray-400">{items.length} items</p>
          </div>
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
        </div>

        {/* Type Filter Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'all' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('movies')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'movies' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            onClick={() => setFilter('tv')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'tv' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Tv className="w-4 h-4" />
            TV Shows
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Sort and Search Bar */}
        {items.length > 0 && (
          <SortFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={searchQuery ? filteredItems.length : undefined}
            placeholder={`Search ${displayName.toLowerCase()}...`}
          />
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
            title={items.length === 0 ? config.emptyMessage : `No ${filter === 'movies' ? 'movies' : 'TV shows'} in this list`}
            subtitle={items.length === 0 ? config.emptySubMessage : 'Try changing the filter'}
            actionLabel={items.length === 0 ? "Search" : undefined}
            actionHref={items.length === 0 ? "/search" : undefined}
          />
        ) : layout === 'list' ? (
          /* List View */
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition group"
              >
                {/* Poster */}
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

                {/* Info */}
                <Link
                  href={`/${item.media_type}/${item.media_id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-400 capitalize">
                    {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                  </p>
                </Link>

                {/* Favorite Indicator */}
                {item.is_favorite && (
                  <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
                )}

                {/* Options Button */}
                <button
                  onClick={() => openOptionsSheet(item)}
                  className="p-2 text-gray-400 hover:text-white transition"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="group relative">
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
                  <h3 className="font-semibold text-xs line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                </Link>

                {item.is_favorite && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                  </div>
                )}

                {/* Options Button (visible on hover) */}
                <button
                  onClick={() => openOptionsSheet(item)}
                  className="absolute bottom-12 right-1 w-7 h-7 bg-black/75 hover:bg-zinc-700 backdrop-blur-sm rounded-full flex items-center justify-center transition z-10 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
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
    </div>
  );
}
