'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Play, List, CheckCircle2, PauseCircle, XCircle, RotateCcw, Sparkles, Heart, ChevronLeft } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

export default function AllShowsListsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>([]);
  const [onHoldItems, setOnHoldItems] = useState<LibraryItem[]>([]);
  const [droppedItems, setDroppedItems] = useState<LibraryItem[]>([]);
  const [rewatchItems, setRewatchItems] = useState<LibraryItem[]>([]);
  const [nostalgiaItems, setNostalgiaItems] = useState<LibraryItem[]>([]);
  const [favoritesItems, setFavoritesItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [
        watchingRes, watchlistRes, watchedRes, onHoldRes,
        droppedRes, rewatchRes, nostalgiaRes, favoritesRes
      ] = await Promise.all([
        fetch('/api/watching'),
        fetch('/api/watchlist'),
        fetch('/api/watched'),
        fetch('/api/onhold'),
        fetch('/api/dropped'),
        fetch('/api/rewatch'),
        fetch('/api/nostalgia'),
        fetch('/api/favorites')
      ]);

      const parseRes = async (res: Response, key: string) => {
        if (!res.ok) return [];
        const data = await res.json();
        const items = data.items || data[key] || [];
        return items.filter((item: LibraryItem) => item.media_type === 'tv');
      };

      setWatchingItems(await parseRes(watchingRes, 'watching'));
      setWatchlistItems(await parseRes(watchlistRes, 'watchlist'));
      setWatchedItems(await parseRes(watchedRes, 'watched'));
      setOnHoldItems(await parseRes(onHoldRes, 'onhold'));
      setDroppedItems(await parseRes(droppedRes, 'dropped'));
      setRewatchItems(await parseRes(rewatchRes, 'rewatch'));
      setNostalgiaItems(await parseRes(nostalgiaRes, 'nostalgia'));

      const favoritesData = await favoritesRes.json().catch(() => ({}));
      const favorites = (favoritesData.favorites || []).filter((item: LibraryItem) => item.media_type === 'tv');
      setFavoritesItems(favorites);
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const lists = [
    { slug: 'watching', title: 'Watching', items: watchingItems, icon: Play, color: 'from-emerald-500 to-emerald-900' },
    { slug: 'watchlist', title: 'Watchlist', items: watchlistItems, icon: List, color: 'from-blue-600 to-blue-900' },
    { slug: 'finished', title: 'Finished', items: watchedItems, icon: CheckCircle2, color: 'from-[#8b5ef4] to-[#5a30c0]' },
    { slug: 'onhold', title: 'On Hold', items: onHoldItems, icon: PauseCircle, color: 'from-yellow-500 to-yellow-900' },
    { slug: 'dropped', title: 'Dropped', items: droppedItems, icon: XCircle, color: 'from-red-600 to-red-900' },
    { slug: 'rewatch', title: 'Rewatch', items: rewatchItems, icon: RotateCcw, color: 'from-cyan-500 to-cyan-900' },
    { slug: 'nostalgia', title: 'Classics', items: nostalgiaItems, icon: Sparkles, color: 'from-amber-500 to-amber-900' },
    { slug: 'favorites', title: 'Favorites', items: favoritesItems, icon: Heart, color: 'from-pink-600 to-pink-900' },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/shows" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">All TV Lists</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {lists.map(({ slug, title, items, icon: Icon, color }) => (
            <Link
              key={slug}
              href={`/shows/${slug}`}
              className={`relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br ${color}`}
            >
              {items[0]?.poster_path && (
                <Image
                  src={getImageUrl(items[0].poster_path)}
                  alt={title}
                  fill
                  className="object-cover object-top opacity-60"
                  sizes="50vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <Icon className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">{title}</h3>
                  <p className="text-sm text-gray-200">{items.length} shows</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
