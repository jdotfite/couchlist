'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Clock, Heart, CheckCircle2, List, Loader2 } from 'lucide-react';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>([]);
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
      const [watchlistRes, watchedRes] = await Promise.all([
        fetch('/api/watchlist'),
        fetch('/api/watched')
      ]);

      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlistItems(data.items || []);
      }

      if (watchedRes.ok) {
        const data = await watchedRes.json();
        setWatchedItems(data.items || []);
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

  const recentItem = watchedItems[0];
  const watchlistItem = watchlistItems[0];
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
            {/* Recent - Show latest watched */}
            <Link
              href="/library/watched"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-purple-900"
            >
              {recentItem ? (
                <>
                  <Image
                    src={recentItem.poster_path}
                    alt={recentItem.title}
                    fill
                    className="object-cover opacity-60"
                    sizes="50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </>
              ) : null}
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <Clock className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Recent</h3>
                  <p className="text-sm text-gray-200">
                    {recentItem ? recentItem.title : 'No items yet'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Watchlist - Show latest added */}
            <Link
              href="/library/watchlist"
              className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-blue-600 to-blue-900"
            >
              {watchlistItem ? (
                <>
                  <Image
                    src={watchlistItem.poster_path}
                    alt={watchlistItem.title}
                    fill
                    className="object-cover opacity-60"
                    sizes="50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </>
              ) : null}
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <List className="w-6 h-6" />
                <div>
                  <h3 className="text-lg mb-1">Watchlist</h3>
                  <p className="text-sm text-gray-200">
                    {watchlistItem ? watchlistItem.title : 'No items yet'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Watched - Total count */}
            <Link
              href="/library/watched"
              className="bg-gradient-to-br from-green-600 to-green-900 rounded-lg p-4 flex flex-col justify-between min-h-[120px]"
            >
              <CheckCircle2 className="w-6 h-6 mb-2" />
              <div>
                <h3 className="text-lg">Watched</h3>
                <p className="text-sm text-gray-200">{watchedItems.length} items</p>
              </div>
            </Link>

            {/* Favorites - Placeholder */}
            <Link
              href="/library/favorites"
              className="bg-gradient-to-br from-pink-600 to-pink-900 rounded-lg p-4 flex flex-col justify-between min-h-[120px]"
            >
              <Heart className="w-6 h-6 mb-2" />
              <div>
                <h3 className="text-lg">Favorites</h3>
                <p className="text-sm text-gray-200">0 items</p>
              </div>
            </Link>
          </div>
        </section>

        {/* My Custom Lists */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">My Lists</h2>
            <button className="text-green-500 hover:text-green-400">
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <Plus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
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
          <h2 className="text-xl mb-4">Your Stats</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">0</p>
                <p className="text-xs text-gray-400 mt-1">Movies Watched</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">0</p>
                <p className="text-xs text-gray-400 mt-1">Shows Watched</p>
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
