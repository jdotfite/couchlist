'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Heart, CheckCircle2, List, Loader2, Play, PauseCircle, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>([]);
  const [onHoldItems, setOnHoldItems] = useState<LibraryItem[]>([]);
  const [droppedItems, setDroppedItems] = useState<LibraryItem[]>([]);
  const [rewatchItems, setRewatchItems] = useState<LibraryItem[]>([]);
  const [nostalgiaItems, setClassicsItems] = useState<LibraryItem[]>([]);
  const [favoritesItems, setFavoritesItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [
        watchingRes,
        watchlistRes,
        watchedRes,
        onHoldRes,
        droppedRes,
        rewatchRes,
        nostalgiaRes,
        favoritesRes
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

      if (watchingRes.ok) {
        const data = await watchingRes.json();
        setWatchingItems(data.items || data.watching || []);
      }

      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlistItems(data.items || []);
      }

      if (watchedRes.ok) {
        const data = await watchedRes.json();
        setWatchedItems(data.items || []);
      }

      if (onHoldRes.ok) {
        const data = await onHoldRes.json();
        setOnHoldItems(data.items || data.onhold || []);
      }

      if (droppedRes.ok) {
        const data = await droppedRes.json();
        setDroppedItems(data.items || data.dropped || []);
      }

      if (rewatchRes.ok) {
        const data = await rewatchRes.json();
        setRewatchItems(data.items || data.rewatch || []);
      }

      if (nostalgiaRes.ok) {
        const data = await nostalgiaRes.json();
        setClassicsItems(data.items || data.nostalgia || []);
      }

      if (favoritesRes.ok) {
        const data = await favoritesRes.json();
        setFavoritesItems(data.favorites || []);
      }
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

  const watchingItem = watchingItems[0];
  const finishedItem = watchedItems[0];
  const watchlistItem = watchlistItems[0];
  const onHoldItem = onHoldItems[0];
  const droppedItem = droppedItems[0];
  const rewatchItem = rewatchItems[0];
  const nostalgiaItem = nostalgiaItems[0];
  const favoritesItem = favoritesItems[0];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="px-4 pt-8 pb-6">
        <h1 className="text-3xl mb-2">Your Library</h1>
        <p className="text-gray-400 text-sm">
          Manage your watchlists and tracked content
        </p>
      </header>

      <main className="px-4">
        {/* Quick Actions Grid */}
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-3">
            {/* Watching */}
            <Link
              href="/library/watching"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-900"
            >
              <Image
                src={watchingItem?.poster_path ? getImageUrl(watchingItem.poster_path) : '/placeholders/place-holder-1.jpg'}
                alt={watchingItem?.title || 'Watching'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <Play className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Watching</h3>
                  <p className="text-sm text-gray-200">
                    {watchingItem ? watchingItem.title : `${watchingItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* Watchlist - Top Right */}
            <Link
              href="/library/watchlist"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-blue-900"
            >
              <Image
                src={watchlistItem?.poster_path ? getImageUrl(watchlistItem.poster_path) : '/placeholders/place-holder-2.jpg'}
                alt={watchlistItem?.title || 'Watchlist'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <List className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Watchlist</h3>
                  <p className="text-sm text-gray-200">
                    {watchlistItem ? watchlistItem.title : `${watchlistItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* Finished */}
            <Link
              href="/library/finished"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-[#8b5ef4] to-[#5a30c0]"
            >
              <Image
                src={finishedItem?.poster_path ? getImageUrl(finishedItem.poster_path) : '/placeholders/place-holder-3.jpg'}
                alt={finishedItem?.title || 'Finished'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Finished</h3>
                  <p className="text-sm text-gray-200">
                    {finishedItem ? finishedItem.title : `${watchedItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* On Hold */}
            <Link
              href="/library/onhold"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500 to-yellow-900"
            >
              <Image
                src={onHoldItem?.poster_path ? getImageUrl(onHoldItem.poster_path) : '/placeholders/place-holder-4.jpg'}
                alt={onHoldItem?.title || 'On Hold'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <PauseCircle className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">On Hold</h3>
                  <p className="text-sm text-gray-200">
                    {onHoldItem ? onHoldItem.title : `${onHoldItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* Dropped */}
            <Link
              href="/library/dropped"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-red-600 to-red-900"
            >
              <Image
                src={droppedItem?.poster_path ? getImageUrl(droppedItem.poster_path) : '/placeholders/place-holder-5.jpg'}
                alt={droppedItem?.title || 'Dropped'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <XCircle className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Dropped</h3>
                  <p className="text-sm text-gray-200">
                    {droppedItem ? droppedItem.title : `${droppedItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* Rewatch */}
            <Link
              href="/library/rewatch"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-900"
            >
              <Image
                src={rewatchItem?.poster_path ? getImageUrl(rewatchItem.poster_path) : '/placeholders/place-holder-6.jpg'}
                alt={rewatchItem?.title || 'Rewatch'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <RotateCcw className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Rewatch</h3>
                  <p className="text-sm text-gray-200">
                    {rewatchItem ? rewatchItem.title : `${rewatchItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* Classics */}
            <Link
              href="/library/nostalgia"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-amber-500 to-amber-900"
            >
              <Image
                src={nostalgiaItem?.poster_path ? getImageUrl(nostalgiaItem.poster_path) : '/placeholders/place-holder-7.jpg'}
                alt={nostalgiaItem?.title || 'Classics'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <Sparkles className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Classics</h3>
                  <p className="text-sm text-gray-200">
                    {nostalgiaItem ? nostalgiaItem.title : `${nostalgiaItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>

            {/* Favorites */}
            <Link
              href="/library/favorites"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-pink-600 to-pink-900"
            >
              <Image
                src={favoritesItem?.poster_path ? getImageUrl(favoritesItem.poster_path) : '/placeholders/place-holder-8.jpg'}
                alt={favoritesItem?.title || 'Favorites'}
                fill
                className="object-cover object-top opacity-60"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <Heart className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Favorites</h3>
                  <p className="text-sm text-gray-200">
                    {favoritesItem ? favoritesItem.title : `${favoritesItems.length} items`}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* My Custom Lists */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl">My Lists</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <h3 className="font-semibold mb-1">Create your first custom list</h3>
            <p className="text-sm text-gray-400 mb-4">
              Organize your movies and shows into custom collections
            </p>
            <button className="bg-white text-black px-6 py-2 rounded-full font-semibold text-sm hover:bg-gray-200 transition">
              Create List
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8">
          <h2 className="text-xl mb-1">Your Stats</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#8b5ef4]">0</p>
                <p className="text-xs text-gray-400 mt-1">Movies Finished</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">0</p>
                <p className="text-xs text-gray-400 mt-1">Shows Finished</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">0</p>
                <p className="text-xs text-gray-400 mt-1">Total Hours</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
