'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, MoreVertical, Grid3X3, List, ArrowLeft, CheckCircle2, Heart, Clock } from 'lucide-react';
import ItemOptionsSheet from '@/components/ItemOptionsSheet';

interface ListItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  added_date?: string;
  watched_date?: string;
  rating?: number;
}

type LayoutType = 'list' | 'grid';

const listConfig: Record<string, { title: string; subtitle: string; apiEndpoint: string; icon: React.ReactNode; emptyMessage: string; emptySubMessage: string }> = {
  watched: {
    title: 'Watched',
    subtitle: 'Movies and shows you\'ve completed',
    apiEndpoint: '/api/watched',
    icon: <CheckCircle2 className="w-6 h-6 text-[#8b5ef4]" />,
    emptyMessage: 'Nothing watched yet',
    emptySubMessage: 'Mark movies and shows as watched to track them here',
  },
  watchlist: {
    title: 'Watchlist',
    subtitle: 'Movies and shows you want to watch',
    apiEndpoint: '/api/watchlist',
    icon: <Clock className="w-6 h-6 text-blue-500" />,
    emptyMessage: 'Your watchlist is empty',
    emptySubMessage: 'Add movies and shows you want to watch',
  },
  favorites: {
    title: 'Favorites',
    subtitle: 'Your all-time favorites',
    apiEndpoint: '/api/favorites',
    icon: <Heart className="w-6 h-6 text-pink-500" />,
    emptyMessage: 'No favorites yet',
    emptySubMessage: 'Add your favorite movies and shows',
  },
};

export default function ListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutType>('list');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const config = listConfig[slug];

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
        setItems(data.items || data.favorites || data.watched || data.watchlist || []);
      }
    } catch (error) {
      console.error(`Failed to fetch ${slug}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (mediaId: number, mediaType: string) => {
    try {
      const response = await fetch(`${config.apiEndpoint}?media_id=${mediaId}&media_type=${mediaType}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => !(item.media_id === mediaId && item.media_type === mediaType)));
      }
    } catch (error) {
      console.error(`Failed to remove from ${slug}:`, error);
    }
  };

  const handleAddToList = async (item: ListItem, listType: string) => {
    const endpoints: Record<string, string> = {
      watchlist: '/api/watchlist',
      watched: '/api/watched',
      favorites: '/api/favorites',
    };

    try {
      await fetch(endpoints[listType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: item.media_id,
          media_type: item.media_type,
          title: item.title,
          poster_path: item.poster_path,
        }),
      });
    } catch (error) {
      console.error(`Failed to add to ${listType}:`, error);
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
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/library"
            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h1 className="text-3xl">{config.title}</h1>
              <p className="text-gray-400 text-sm">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>

          {/* Layout Toggle */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setLayout('list')}
              className={`p-2 rounded-md transition ${
                layout === 'list' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`p-2 rounded-md transition ${
                layout === 'grid' ? 'bg-zinc-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-400 mb-1">{config.emptyMessage}</p>
            <p className="text-sm text-gray-500">{config.emptySubMessage}</p>
          </div>
        ) : layout === 'list' ? (
          /* Spotify-style List View */
          <div className="space-y-1">
            {items.map((item) => (
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
                    src={item.poster_path}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </Link>

                {/* Info */}
                <Link
                  href={`/${item.media_type}/${item.media_id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-400 capitalize">{item.media_type}</p>
                  {item.rating && (
                    <p className="text-xs text-yellow-500">{'★'.repeat(item.rating)}</p>
                  )}
                </Link>

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
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <Link href={`/${item.media_type}/${item.media_id}`}>
                  <div className="relative aspect-[2/3] mb-2 overflow-hidden rounded-lg bg-zinc-800">
                    <Image
                      src={item.poster_path}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:opacity-75 transition"
                      sizes="50vw"
                    />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 capitalize">{item.media_type}</p>
                  </div>
                </Link>

                {/* Options Button */}
                <button
                  onClick={() => openOptionsSheet(item)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-zinc-700 backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Options Sheet */}
      <ItemOptionsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        item={selectedItem}
        currentList={slug}
        onRemove={handleRemove}
        onAddToWatchlist={(item) => handleAddToList(item, 'watchlist')}
        onAddToWatched={(item) => handleAddToList(item, 'watched')}
        onAddToFavorites={(item) => handleAddToList(item, 'favorites')}
      />
    </div>
  );
}
