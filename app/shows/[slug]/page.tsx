'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Heart, Clock, Play, PauseCircle, XCircle, RotateCcw, Sparkles, ChevronLeft, Users } from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import MediaCard, { MediaCardItem } from '@/components/MediaCard';
import EmptyState from '@/components/EmptyState';
import MediaListSkeleton from '@/components/MediaListSkeleton';
import SortFilterBar, { SortOption, sortItems, filterItems } from '@/components/SortFilterBar';
import LayoutToggle, { LayoutOption } from '@/components/ui/LayoutToggle';
import { useListPreferences } from '@/hooks/useListPreferences';

type ListItem = MediaCardItem;

type IconType = 'finished' | 'watchlist' | 'watching' | 'onhold' | 'dropped' | 'rewatch' | 'classics' | 'favorites';

const listConfig: Record<string, { title: string; subtitle: string; apiEndpoint: string; icon: React.ReactNode; iconType: IconType; emptyMessage: string; emptySubMessage: string }> = {
  finished: {
    title: 'Watched',
    subtitle: 'TV shows you\'ve completed',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-brand-primary" />,
    iconType: 'finished',
    emptyMessage: 'No shows watched yet',
    emptySubMessage: 'Mark TV shows as watched to track them here',
  },
  watched: {
    title: 'Watched',
    subtitle: 'TV shows you\'ve completed',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-brand-primary" />,
    iconType: 'finished',
    emptyMessage: 'No shows watched yet',
    emptySubMessage: 'Mark TV shows as watched to track them here',
  },
  watching: {
    title: 'Watching',
    subtitle: 'TV shows in progress',
    apiEndpoint: '/api/watching',
    icon: <Play className="w-6 h-6 text-green-500" />,
    iconType: 'watching',
    emptyMessage: 'No shows in progress',
    emptySubMessage: 'Add TV shows you\'re currently watching',
  },
  watchlist: {
    title: 'Watchlist',
    subtitle: 'TV shows you want to watch',
    apiEndpoint: '/api/watchlist',
    icon: <Clock className="w-6 h-6 text-blue-500" />,
    iconType: 'watchlist',
    emptyMessage: 'Your TV watchlist is empty',
    emptySubMessage: 'Add TV shows you want to watch',
  },
  onhold: {
    title: 'On Hold',
    subtitle: 'TV shows paused for later',
    apiEndpoint: '/api/onhold',
    icon: <PauseCircle className="w-6 h-6 text-yellow-500" />,
    iconType: 'onhold',
    emptyMessage: 'No shows on hold',
    emptySubMessage: 'Add TV shows you\'ve paused',
  },
  dropped: {
    title: 'Dropped',
    subtitle: 'TV shows you stopped watching',
    apiEndpoint: '/api/dropped',
    icon: <XCircle className="w-6 h-6 text-red-500" />,
    iconType: 'dropped',
    emptyMessage: 'No dropped shows',
    emptySubMessage: 'Add TV shows you stopped watching',
  },
  rewatch: {
    title: 'Rewatch',
    subtitle: 'TV shows worth another watch',
    apiEndpoint: '/api/rewatch',
    icon: <RotateCcw className="w-6 h-6 text-cyan-500" />,
    iconType: 'rewatch',
    emptyMessage: 'No shows to rewatch',
    emptySubMessage: 'Add TV shows you want to revisit',
  },
  nostalgia: {
    title: 'Classics',
    subtitle: 'Nostalgic TV favorites',
    apiEndpoint: '/api/nostalgia',
    icon: <Sparkles className="w-6 h-6 text-amber-500" />,
    iconType: 'classics',
    emptyMessage: 'No classic shows yet',
    emptySubMessage: 'Add TV shows from your past',
  },
  favorites: {
    title: 'Favorites',
    subtitle: 'Your favorite TV shows',
    apiEndpoint: '/api/favorites',
    icon: <Heart className="w-6 h-6 text-pink-500" />,
    iconType: 'favorites',
    emptyMessage: 'No favorite shows yet',
    emptySubMessage: 'Add your favorite TV shows',
  },
};

export default function ShowsListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutOption>('list');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');
  const { getListName } = useListPreferences();

  const config = listConfig[slug];

  // Map slug to list type for sharing check
  const listTypeMap: Record<string, string> = {
    finished: 'finished',
    watched: 'finished',
    watching: 'watching',
    watchlist: 'watchlist',
    onhold: 'onhold',
    dropped: 'dropped',
    favorites: 'favorites',
    rewatch: 'rewatch',
    nostalgia: 'nostalgia',
  };
  const listType = listTypeMap[slug] || slug;

  // Get custom list name if set, otherwise use default
  const displayTitle = getListName(listType) || config?.title || 'List';

  const STATUS_LISTS = ['watchlist', 'watching', 'onhold', 'dropped', 'finished', 'watched'];
  const TAG_LISTS = ['favorites', 'rewatch', 'nostalgia'];
  const isTagList = TAG_LISTS.includes(slug);

  // Filter to only TV shows, then apply search and sort
  const filteredItems = useMemo(() => {
    const tvItems = items.filter(item => item.media_type === 'tv');
    const searched = filterItems(tvItems, searchQuery);
    return sortItems(searched, sortBy);
  }, [items, searchQuery, sortBy]);

  useEffect(() => {
    if (status === 'authenticated' && config) {
      fetchItems();
      fetchSharedStatus();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, slug]);

  const fetchSharedStatus = async () => {
    try {
      const response = await fetch('/api/collaborators/shared-lists');
      if (response.ok) {
        const data = await response.json();
        setIsShared(data.sharedLists?.includes(listType) || false);
      }
    } catch (error) {
      console.error('Failed to fetch shared status:', error);
    }
  };

  const fetchItems = async () => {
    if (!config) return;

    try {
      const response = await fetch(config.apiEndpoint);
      if (response.ok) {
        const data = await response.json();
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

  const handleRemove = () => {
    if (!selectedItem) return;
    setItems(items.filter(item =>
      !(item.media_id === selectedItem.media_id && item.media_type === selectedItem.media_type)
    ));
  };

  const handleStatusChange = (newStatus: string) => {
    if (!selectedItem) return;
    if (STATUS_LISTS.includes(slug) && STATUS_LISTS.includes(newStatus) && slug !== newStatus) {
      setItems(items.filter(i =>
        !(i.media_id === selectedItem.media_id && i.media_type === selectedItem.media_type)
      ));
    }
  };

  const handleTagToggle = (tag: string, added: boolean) => {
    if (!selectedItem) return;
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
          <Link href="/shows" className="text-blue-500 hover:underline">
            Back to Shows
          </Link>
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
          <Link href="/shows" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{displayTitle}</h1>
              {isShared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-xs font-medium rounded-full">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{filteredItems.length} TV shows</p>
          </div>
          <LayoutToggle layout={layout} onLayoutChange={setLayout} />
        </div>
      </header>

      <main className="px-4">
        {/* Search Bar */}
        {items.filter(item => item.media_type === 'tv').length > 0 && (
          <SortFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchQuery ? filteredItems.length : undefined}
            placeholder="Search TV shows..."
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
            title={config.emptyMessage}
            subtitle={config.emptySubMessage}
            actionLabel="Search Shows"
            actionHref="/search?type=tv"
          />
        ) : layout === 'list' ? (
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                variant="list"
                onOptionsClick={() => openOptionsSheet(item)}
                currentUserId={session?.user?.id ? Number(session.user.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                variant="grid"
                onOptionsClick={() => openOptionsSheet(item)}
                currentUserId={session?.user?.id ? Number(session.user.id) : undefined}
              />
            ))}
          </div>
        )}
      </main>

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
