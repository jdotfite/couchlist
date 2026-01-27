'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainHeader from '@/components/ui/MainHeader';
import SearchHero from '@/components/home/SearchHero';
import MediaRow from '@/components/home/MediaRow';
import ListsGrid from '@/components/home/ListsGrid';
import HomePageSkeleton from '@/components/home/HomePageSkeleton';
import { useListPreferences } from '@/hooks/useListPreferences';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { Play, List, CheckCircle2, LayoutGrid } from 'lucide-react';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const { getListName } = useListPreferences();

  // Get state and actions from Zustand store
  const {
    watchingItems,
    watchlistItems,
    finishedItems,
    customListsCount,
    isLoading,
    lastFetched,
    fetchLibrary,
  } = useLibraryStore();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLibrary();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchLibrary]);

  // Show skeleton while loading (only on first load)
  if (status === 'loading' || status === 'unauthenticated' || (isLoading && !lastFetched)) {
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
      title: getListName('finished') || 'Watched',
      count: finishedItems.length,
      posterPath: finishedItems[0]?.poster_path || null,
      icon: CheckCircle2,
      color: 'from-brand-primary to-brand-primary-darker',
    },
    {
      slug: 'all',
      title: 'All Lists',
      count: 3 + customListsCount,
      posterPath: null,
      icon: LayoutGrid,
      color: 'from-zinc-600 to-zinc-800',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <MainHeader showLogo />

      <main className="px-4">
        {/* Search Hero */}
        <SearchHero />

        {/* Your Lists */}
        <ListsGrid lists={listsData} />

        {/* Watching */}
        <MediaRow
          title={getListName('watching') || 'Watching'}
          items={watchingItems}
          seeAllHref="/library?status=watching"
          addHref="/search"
        />

        {/* Watchlist */}
        <MediaRow
          title={getListName('watchlist') || 'Watchlist'}
          items={watchlistItems}
          seeAllHref="/library?status=watchlist"
          addHref="/search"
        />

        {/* Watched */}
        <MediaRow
          title={getListName('finished') || 'Watched'}
          items={finishedItems}
          seeAllHref="/library?status=finished"
          addHref="/search"
        />
      </main>
    </div>
  );
}
