'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Grid3X3, List, CheckCircle2, Heart, Clock, Play, PauseCircle, XCircle, RotateCcw, Sparkles, ChevronLeft } from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import MediaCard, { MediaCardItem } from '@/components/MediaCard';
import EmptyState from '@/components/EmptyState';
import MediaListSkeleton from '@/components/MediaListSkeleton';

type ListItem = MediaCardItem;

type LayoutType = 'list' | 'grid';

type IconType = 'finished' | 'watchlist' | 'watching' | 'onhold' | 'dropped' | 'rewatch' | 'classics' | 'favorites';

const listConfig: Record<string, { title: string; subtitle: string; apiEndpoint: string; icon: React.ReactNode; iconType: IconType; emptyMessage: string; emptySubMessage: string }> = {
  finished: {
    title: 'Finished',
    subtitle: 'Movies you\'ve watched',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-brand-primary" />,
    iconType: 'finished',
    emptyMessage: 'No finished movies yet',
    emptySubMessage: 'Mark movies as finished to track them here',
  },
  watched: {
    title: 'Finished',
    subtitle: 'Movies you\'ve watched',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-brand-primary" />,
    iconType: 'finished',
    emptyMessage: 'No finished movies yet',
    emptySubMessage: 'Mark movies as finished to track them here',
  },
  watching: {
    title: 'Watching',
    subtitle: 'Movies in progress',
    apiEndpoint: '/api/watching',
    icon: <Play className="w-6 h-6 text-green-500" />,
    iconType: 'watching',
    emptyMessage: 'No movies in progress',
    emptySubMessage: 'Add movies you\'re currently watching',
  },
  watchlist: {
    title: 'Watchlist',
    subtitle: 'Movies you want to watch',
    apiEndpoint: '/api/watchlist',
    icon: <Clock className="w-6 h-6 text-blue-500" />,
    iconType: 'watchlist',
    emptyMessage: 'Your movie watchlist is empty',
    emptySubMessage: 'Add movies you want to watch',
  },
  onhold: {
    title: 'On Hold',
    subtitle: 'Movies paused for later',
    apiEndpoint: '/api/onhold',
    icon: <PauseCircle className="w-6 h-6 text-yellow-500" />,
    iconType: 'onhold',
    emptyMessage: 'No movies on hold',
    emptySubMessage: 'Add movies you\'ve paused',
  },
  dropped: {
    title: 'Dropped',
    subtitle: 'Movies you stopped watching',
    apiEndpoint: '/api/dropped',
    icon: <XCircle className="w-6 h-6 text-red-500" />,
    iconType: 'dropped',
    emptyMessage: 'No dropped movies',
    emptySubMessage: 'Add movies you stopped watching',
  },
  rewatch: {
    title: 'Rewatch',
    subtitle: 'Movies worth another watch',
    apiEndpoint: '/api/rewatch',
    icon: <RotateCcw className="w-6 h-6 text-cyan-500" />,
    iconType: 'rewatch',
    emptyMessage: 'No movies to rewatch',
    emptySubMessage: 'Add movies you want to revisit',
  },
  nostalgia: {
    title: 'Classics',
    subtitle: 'Nostalgic movie favorites',
    apiEndpoint: '/api/nostalgia',
    icon: <Sparkles className="w-6 h-6 text-amber-500" />,
    iconType: 'classics',
    emptyMessage: 'No classic movies yet',
    emptySubMessage: 'Add movies from your past',
  },
  favorites: {
    title: 'Favorites',
    subtitle: 'Your favorite movies',
    apiEndpoint: '/api/favorites',
    icon: <Heart className="w-6 h-6 text-pink-500" />,
    iconType: 'favorites',
    emptyMessage: 'No favorite movies yet',
    emptySubMessage: 'Add your favorite movies',
  },
};

export default function MoviesListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutType>('list');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const config = listConfig[slug];

  const STATUS_LISTS = ['watchlist', 'watching', 'onhold', 'dropped', 'finished', 'watched'];
  const TAG_LISTS = ['favorites', 'rewatch', 'nostalgia'];
  const isTagList = TAG_LISTS.includes(slug);

  // Filter to only movies
  const filteredItems = items.filter(item => item.media_type === 'movie');

  useEffect(() => {
    if (status === 'authenticated' && config) {
      fetchItems();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, slug]);

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
          <Link href="/movies" className="text-blue-500 hover:underline">
            Back to Movies
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
          <Link href="/movies" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{config.title}</h1>
            <p className="text-xs text-gray-400">{filteredItems.length} movies</p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setLayout('list')}
              className={`p-2 rounded-md transition ${
                layout === 'list' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`p-2 rounded-md transition ${
                layout === 'grid' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            iconType={config.iconType}
            title={config.emptyMessage}
            subtitle={config.emptySubMessage}
            actionLabel="Discover Movies"
            actionHref="/discover?filter=movies"
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
