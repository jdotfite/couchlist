'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Trash2 } from 'lucide-react';

interface WatchedItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  watched_date: string;
  rating: number | null;
}

export default function WatchedPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<WatchedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWatched();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const fetchWatched = async () => {
    try {
      const response = await fetch('/api/watched');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch watched:', error);
    } finally {
      setIsLoading(false);
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
          <h2 className="text-2xl font-bold mb-2">Sign in to view your watched content</h2>
          <p className="text-gray-400">Track the movies and shows you've watched</p>
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
        <h1 className="text-3xl font-bold mb-2">Watched</h1>
        <p className="text-gray-400 text-sm">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
      </header>

      <main className="px-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-400 mb-1">You haven't watched anything yet</p>
            <p className="text-sm text-gray-500">Mark movies and shows as watched to track them</p>
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
