'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getImageUrl } from '@/lib/tmdb';
import { Plus } from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import LibraryDashboardSkeleton from '@/components/LibraryDashboardSkeleton';
import { useListPreferences } from '@/hooks/useListPreferences';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

interface ShowsCache {
  watchingItems: LibraryItem[];
  watchlistItems: LibraryItem[];
  watchedItems: LibraryItem[];
  onHoldItems: LibraryItem[];
  droppedItems: LibraryItem[];
  rewatchItems: LibraryItem[];
  nostalgiaItems: LibraryItem[];
  favoritesItems: LibraryItem[];
  trendingTV: any[];
  popularTV: any[];
  topRatedTV: any[];
}

export default function ShowsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const initialCache = useMemo<ShowsCache | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('flicklog-shows-cache');
      if (!raw) return null;
      return JSON.parse(raw) as ShowsCache;
    } catch {
      return null;
    }
  }, []);

  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>(() => initialCache?.watchingItems || []);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>(() => initialCache?.watchlistItems || []);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>(() => initialCache?.watchedItems || []);
  const [onHoldItems, setOnHoldItems] = useState<LibraryItem[]>(() => initialCache?.onHoldItems || []);
  const [droppedItems, setDroppedItems] = useState<LibraryItem[]>(() => initialCache?.droppedItems || []);
  const [rewatchItems, setRewatchItems] = useState<LibraryItem[]>(() => initialCache?.rewatchItems || []);
  const [nostalgiaItems, setNostalgiaItems] = useState<LibraryItem[]>(() => initialCache?.nostalgiaItems || []);
  const [favoritesItems, setFavoritesItems] = useState<LibraryItem[]>(() => initialCache?.favoritesItems || []);
  const [trendingTV, setTrendingTV] = useState<any[]>(() => initialCache?.trendingTV || []);
  const [popularTV, setPopularTV] = useState<any[]>(() => initialCache?.popularTV || []);
  const [topRatedTV, setTopRatedTV] = useState<any[]>(() => initialCache?.topRatedTV || []);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { getListName } = useListPreferences();

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
        return data.items || data[key] || [];
      };

      const watching = await parseRes(watchingRes, 'watching');
      const watchlist = await parseRes(watchlistRes, 'watchlist');
      const watched = await parseRes(watchedRes, 'watched');
      const onHold = await parseRes(onHoldRes, 'onhold');
      const dropped = await parseRes(droppedRes, 'dropped');
      const rewatch = await parseRes(rewatchRes, 'rewatch');
      const nostalgia = await parseRes(nostalgiaRes, 'nostalgia');
      const favoritesData = await favoritesRes.json().catch(() => ({}));
      const favorites = favoritesData.favorites || [];

      // Filter to only TV shows
      const filterTV = (items: LibraryItem[]) => items.filter(item => item.media_type === 'tv');

      const nextState = {
        watchingItems: filterTV(watching),
        watchlistItems: filterTV(watchlist),
        watchedItems: filterTV(watched),
        onHoldItems: filterTV(onHold),
        droppedItems: filterTV(dropped),
        rewatchItems: filterTV(rewatch),
        nostalgiaItems: filterTV(nostalgia),
        favoritesItems: filterTV(favorites),
      };

      setWatchingItems(nextState.watchingItems);
      setWatchlistItems(nextState.watchlistItems);
      setWatchedItems(nextState.watchedItems);
      setOnHoldItems(nextState.onHoldItems);
      setDroppedItems(nextState.droppedItems);
      setRewatchItems(nextState.rewatchItems);
      setNostalgiaItems(nextState.nostalgiaItems);
      setFavoritesItems(nextState.favoritesItems);
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

      const nextState = {
        trendingTV: data.trendingTV || [],
        popularTV: data.popularTV || [],
        topRatedTV: data.topRatedTV || [],
      };

      setTrendingTV(nextState.trendingTV);
      setPopularTV(nextState.popularTV);
      setTopRatedTV(nextState.topRatedTV);
      return nextState;
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      return null;
    }
  };

  const writeCache = (cache: ShowsCache) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('flicklog-shows-cache', JSON.stringify(cache));
    } catch {}
  };

  const refreshCache = async () => {
    const [libraryData, trendingData] = await Promise.all([fetchLibrary(), fetchTrending()]);
    if (libraryData && trendingData) {
      writeCache({ ...libraryData, ...trendingData });
    }
  };

  const handleAddClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  // Get first item for each list thumbnail
  const watchingItem = watchingItems[0];
  const watchlistItem = watchlistItems[0];
  const finishedItem = watchedItems[0];
  const onHoldItem = onHoldItems[0];

  if (status === 'loading' || status === 'unauthenticated' || isLoading) {
    return <LibraryDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileMenu />
            <h1 className="text-2xl font-bold">TV Shows</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pt-2">
        {/* Your TV Lists */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your Lists</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/shows/watching"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0">
                {watchingItem?.poster_path ? (
                  <Image
                    src={getImageUrl(watchingItem.poster_path)}
                    alt="Watching"
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-emerald-900" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{getListName('watching') || 'Watching'}</h3>
                <p className="text-xs text-gray-400">{watchingItems.length} shows</p>
              </div>
            </Link>

            <Link
              href="/shows/watchlist"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0">
                {watchlistItem?.poster_path ? (
                  <Image
                    src={getImageUrl(watchlistItem.poster_path)}
                    alt="Watchlist"
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-900" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{getListName('watchlist') || 'Watchlist'}</h3>
                <p className="text-xs text-gray-400">{watchlistItems.length} shows</p>
              </div>
            </Link>

            <Link
              href="/shows/finished"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0">
                {finishedItem?.poster_path ? (
                  <Image
                    src={getImageUrl(finishedItem.poster_path)}
                    alt="Finished"
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-primary to-brand-primary-darker" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{getListName('finished') || 'Finished'}</h3>
                <p className="text-xs text-gray-400">{watchedItems.length} shows</p>
              </div>
            </Link>

            <Link
              href="/shows/all"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0">
                {onHoldItem?.poster_path ? (
                  <Image
                    src={getImageUrl(onHoldItem.poster_path)}
                    alt="All Lists"
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-600 to-zinc-800" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm">All Lists</h3>
                <p className="text-xs text-gray-400">View all</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Continue Watching */}
        {watchingItems.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Continue Watching</h2>
              <Link href="/shows/watching" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {watchingItems.slice(0, 10).map((show) => (
                  <Link
                    key={show.id}
                    href={`/tv/${show.media_id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      <Image
                        src={show.poster_path ? getImageUrl(show.poster_path) : '/placeholders/place-holder-1.jpg'}
                        alt={show.title}
                        fill
                        className="object-cover group-hover:opacity-75 transition"
                        sizes="40vw"
                      />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{show.title}</h3>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Trending TV */}
        {trendingTV.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Trending TV Shows</h2>
              <Link href="/discover?filter=tv" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {trendingTV.map((show: any) => (
                  <Link
                    key={show.id}
                    href={`/tv/${show.id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {show.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                          alt={show.name}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}

                      <button
                        onClick={(e) => handleAddClick(e, {
                          id: show.id,
                          media_type: 'tv',
                          title: show.name,
                          poster_path: show.poster_path,
                        })}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{show.name}</h3>
                    <p className="text-xs text-gray-400">{show.first_air_date?.split('-')[0]}</p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Popular TV */}
        {popularTV.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Popular TV Shows</h2>
              <Link href="/discover?filter=tv" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {popularTV.map((show: any) => (
                  <Link
                    key={show.id}
                    href={`/tv/${show.id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {show.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                          alt={show.name}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}

                      <button
                        onClick={(e) => handleAddClick(e, {
                          id: show.id,
                          media_type: 'tv',
                          title: show.name,
                          poster_path: show.poster_path,
                        })}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{show.name}</h3>
                    <p className="text-xs text-gray-400">{show.first_air_date?.split('-')[0]}</p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Top Rated TV */}
        {topRatedTV.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Top Rated TV Shows</h2>
              <Link href="/discover?filter=tv" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {topRatedTV.map((show: any) => (
                  <Link
                    key={show.id}
                    href={`/tv/${show.id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {show.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                          alt={show.name}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}

                      <button
                        onClick={(e) => handleAddClick(e, {
                          id: show.id,
                          media_type: 'tv',
                          title: show.name,
                          poster_path: show.poster_path,
                        })}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{show.name}</h3>
                    <p className="text-xs text-gray-400">{show.first_air_date?.split('-')[0]}</p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}
      </main>

      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.id}
          mediaType="tv"
          title={selectedItem.title}
          posterPath={selectedItem.poster_path}
        />
      )}
    </div>
  );
}
