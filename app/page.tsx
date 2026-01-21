'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import SearchHero from '@/components/home/SearchHero';
import ContinueWatching from '@/components/home/ContinueWatching';
import ListsGrid, { DEFAULT_LISTS } from '@/components/home/ListsGrid';
import HomePageSkeleton from '@/components/home/HomePageSkeleton';
import { useListPreferences } from '@/hooks/useListPreferences';
import { Play, List, CheckCircle2, LayoutGrid } from 'lucide-react';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

interface HomeCache {
  watchingItems: LibraryItem[];
  watchlistItems: LibraryItem[];
  finishedItems: LibraryItem[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getListName } = useListPreferences();

  const initialCache = useMemo<HomeCache | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('flicklog-home-cache');
      if (!raw) return null;
      return JSON.parse(raw) as HomeCache;
    } catch {
      return null;
    }
  }, []);

  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>(() => initialCache?.watchingItems || []);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>(() => initialCache?.watchlistItems || []);
  const [finishedItems, setFinishedItems] = useState<LibraryItem[]>(() => initialCache?.finishedItems || []);
  const [isLoading, setIsLoading] = useState(() => !initialCache);

  useEffect(() => {
    if (status === 'authenticated') {
      const loadData = async () => {
        if (initialCache) {
          setIsLoading(false);
          void refreshCache();
          return;
        }
        setIsLoading(true);
        await refreshCache();
        setIsLoading(false);
      };
      loadData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, initialCache]);

  const fetchLibrary = async () => {
    try {
      const [watchingRes, watchlistRes, finishedRes] = await Promise.all([
        fetch('/api/watching'),
        fetch('/api/watchlist'),
        fetch('/api/watched'),
      ]);

      const parseRes = async (res: Response) => {
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      };

      const watching = await parseRes(watchingRes);
      const watchlist = await parseRes(watchlistRes);
      const finished = await parseRes(finishedRes);

      const nextState = {
        watchingItems: watching,
        watchlistItems: watchlist,
        finishedItems: finished,
      };

      setWatchingItems(nextState.watchingItems);
      setWatchlistItems(nextState.watchlistItems);
      setFinishedItems(nextState.finishedItems);
      return nextState;
    } catch (error) {
      console.error('Failed to fetch library:', error);
      return null;
    }
  };

  const writeCache = (cache: HomeCache) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('flicklog-home-cache', JSON.stringify(cache));
    } catch {}
  };

  const refreshCache = async () => {
    const libraryData = await fetchLibrary();
    if (libraryData) {
      writeCache(libraryData);
    }
  };

  if (status === 'loading' || status === 'unauthenticated' || isLoading) {
    return <HomePageSkeleton />;
  }

  // Build lists data for the grid
  const listsData = [
    {
      slug: 'watching',
      title: getListName('watching') || 'Watching',
      count: watchingItems.length,
      posterPath: watchingItems[0]?.poster_path || null,
      icon: Play,
      color: 'from-emerald-500 to-emerald-900',
    },
    {
      slug: 'watchlist',
      title: getListName('watchlist') || 'Watchlist',
      count: watchlistItems.length,
      posterPath: watchlistItems[0]?.poster_path || null,
      icon: List,
      color: 'from-blue-600 to-blue-900',
    },
    {
      slug: 'finished',
      title: getListName('finished') || 'Finished',
      count: finishedItems.length,
      posterPath: finishedItems[0]?.poster_path || null,
      icon: CheckCircle2,
      color: 'from-brand-primary to-brand-primary-darker',
    },
    {
      slug: 'all',
      title: 'All Items',
      count: watchingItems.length + watchlistItems.length + finishedItems.length,
      posterPath: null,
      icon: LayoutGrid,
      color: 'from-zinc-600 to-zinc-800',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileMenu />
            <Image
              src="/logo-flicklog.svg"
              alt="FlickLog"
              width={105}
              height={27}
              className="h-7 w-auto"
              priority
            />
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pt-2">
        {/* Search Hero */}
        <SearchHero />

        {/* Your Lists */}
        <ListsGrid lists={listsData} />

        {/* Continue Watching */}
        <ContinueWatching items={watchingItems} />
      </main>
    </div>
  );
}
