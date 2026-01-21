'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  List,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences } from '@/hooks/useListPreferences';

interface ListData {
  slug: string;
  title: string;
  icon: typeof Play;
  color: string;
  items: { poster_path: string | null }[];
  count: number;
}

const listConfig = [
  { slug: 'watching', title: 'Watching', icon: Play, color: 'from-emerald-500 to-emerald-700', api: '/api/watching' },
  { slug: 'watchlist', title: 'Watchlist', icon: List, color: 'from-blue-500 to-blue-700', api: '/api/watchlist' },
  { slug: 'finished', title: 'Finished', icon: CheckCircle2, color: 'from-purple-500 to-purple-700', api: '/api/watched' },
  { slug: 'onhold', title: 'On Hold', icon: PauseCircle, color: 'from-amber-500 to-amber-700', api: '/api/onhold' },
  { slug: 'dropped', title: 'Dropped', icon: XCircle, color: 'from-red-500 to-red-700', api: '/api/dropped' },
];

export default function LibraryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getListName } = useListPreferences();

  const [lists, setLists] = useState<ListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllLists();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchAllLists = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.all(
        listConfig.map(async (config) => {
          try {
            const response = await fetch(config.api);
            if (response.ok) {
              const data = await response.json();
              const items = data.items || [];
              return {
                slug: config.slug,
                title: config.title,
                icon: config.icon,
                color: config.color,
                items: items.slice(0, 4), // Get first 4 for preview
                count: items.length,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch ${config.slug}:`, error);
          }
          return {
            slug: config.slug,
            title: config.title,
            icon: config.icon,
            color: config.color,
            items: [],
            count: 0,
          };
        })
      );

      setLists(results);
      setTotalCount(results.reduce((sum, list) => sum + list.count, 0));
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileMenu />
            <h1 className="text-2xl font-bold">Library</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Total Count */}
        <p className="text-sm text-gray-400 mb-6">{totalCount} items in your library</p>

        {/* List Cards */}
        <div className="space-y-3">
          {lists.map((list) => {
            const IconComponent = list.icon;
            const displayName = getListName(list.slug) || list.title;

            return (
              <Link
                key={list.slug}
                href={`/library/${list.slug}`}
                className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl overflow-hidden transition group"
              >
                <div className="flex items-center p-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${list.color} flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 ml-4 min-w-0">
                    <h3 className="font-semibold text-lg">{displayName}</h3>
                    <p className="text-sm text-gray-400">{list.count} items</p>
                  </div>

                  {/* Preview Posters */}
                  {list.items.length > 0 && (
                    <div className="flex -space-x-2 mr-2">
                      {list.items.slice(0, 3).map((item, index) => (
                        <div
                          key={index}
                          className="relative w-8 h-12 rounded overflow-hidden border-2 border-zinc-900 flex-shrink-0"
                          style={{ zIndex: 3 - index }}
                        >
                          {item.poster_path ? (
                            <Image
                              src={getImageUrl(item.poster_path)}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-700" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Link to Custom Lists */}
        <div className="mt-8">
          <Link
            href="/lists"
            className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Custom Lists</h3>
                <p className="text-sm text-gray-400">Create and manage your own lists</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
