'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Trash2 } from 'lucide-react';

interface WatchlistItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  added_date: string;
}

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWatchlist();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const fetchWatchlist = async () => {
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (mediaId: number, mediaType: string) => {
    try {
      const response = await fetch(`/api/watchlist?media_id=${mediaId}&media_type=${mediaType}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => !(item.media_id === mediaId && item.media_type === mediaType)));
      }
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
    }
  };

  if (!session?.user && status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sign in to view your watchlist</h2>
          <p className="text-gray-400">Track the movies and shows you want to watch</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="px-4 pt-8 pb-6">
        <h1 className="text-3xl font-bold mb-2">Watchlist</h1>
        <p className="text-gray-400 text-sm">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
      </header>

      <main className="px-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-400 mb-1">Your watchlist is empty</p>
            <p className="text-sm text-gray-500">Add movies and shows you want to watch</p>
          </div>
        ) : (
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
                    <p className="text-xs text-gray-400 uppercase">{item.media_type}</p>
                  </div>
                </Link>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(item.media_id, item.media_type);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-red-600 backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
