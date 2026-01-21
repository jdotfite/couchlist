'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import SearchHero from '@/components/home/SearchHero';
import ContinueWatching from '@/components/home/ContinueWatching';
import ListsGrid, { DEFAULT_LISTS } from '@/components/home/ListsGrid';
import TrendingRow from '@/components/home/TrendingRow';
import HomePageSkeleton from '@/components/home/HomePageSkeleton';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import { useListPreferences } from '@/hooks/useListPreferences';
import { Play, List, CheckCircle2, LayoutGrid } from 'lucide-react';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

interface TrendingItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

interface HomeCache {
  watchingItems: LibraryItem[];
  watchlistItems: LibraryItem[];
  finishedItems: LibraryItem[];
  trendingAll: TrendingItem[];
  popularAll: TrendingItem[];
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
  const [trendingAll, setTrendingAll] = useState<TrendingItem[]>(() => initialCache?.trendingAll || []);
  const [popularAll, setPopularAll] = useState<TrendingItem[]>(() => initialCache?.popularAll || []);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  const fetchTrending = async () => {
    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Failed to fetch trending');
      const data = await response.json();

      // Combine movies and TV, interleaved for variety
      const trending = [...(data.trendingMovies || []), ...(data.trendingTV || [])];
      const popular = [...(data.popularMovies || []), ...(data.popularTV || [])];

      // Shuffle to mix content types
      const shuffleMix = (arr: TrendingItem[]) => {
        const result: TrendingItem[] = [];
        const movies = arr.filter(i => i.media_type === 'movie');
        const tv = arr.filter(i => i.media_type === 'tv');
        const maxLen = Math.max(movies.length, tv.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies[i]) result.push(movies[i]);
          if (tv[i]) result.push(tv[i]);
        }
        return result;
      };

      const nextState = {
        trendingAll: shuffleMix(trending).slice(0, 15),
        popularAll: shuffleMix(popular).slice(0, 15),
      };

      setTrendingAll(nextState.trendingAll);
      setPopularAll(nextState.popularAll);
      return nextState;
    } catch (error) {
      console.error('Failed to fetch trending:', error);
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
    const [libraryData, trendingData] = await Promise.all([fetchLibrary(), fetchTrending()]);
    if (libraryData && trendingData) {
      writeCache({ ...libraryData, ...trendingData });
    }
  };

  const handleAddClick = (item: TrendingItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
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
            <h1 className="text-2xl font-bold">FlickLog</h1>
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

        {/* Trending Now */}
        <TrendingRow
          title="Trending Now"
          items={trendingAll}
          seeAllLink="/search"
          onAddClick={handleAddClick}
        />

        {/* Popular */}
        <TrendingRow
          title="Popular"
          items={popularAll}
          seeAllLink="/search"
          onAddClick={handleAddClick}
        />
      </main>

      {/* Media Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.id}
          mediaType={selectedItem.media_type}
          title={selectedItem.title || selectedItem.name || 'Unknown'}
          posterPath={selectedItem.poster_path}
        />
      )}
    </div>
  );
}
