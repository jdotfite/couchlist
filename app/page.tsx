'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';
import { getImageUrl } from '@/lib/tmdb';
import HomeSkeleton from '@/components/HomeSkeleton';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

type HomeCache = {
  watchingItems: LibraryItem[];
  watchlistItems: LibraryItem[];
  watchedItems: LibraryItem[];
  onHoldItems: LibraryItem[];
  droppedItems: LibraryItem[];
  rewatchItems: LibraryItem[];
  nostalgiaItems: LibraryItem[];
  favoritesItems: LibraryItem[];
  trendingMovies: any[];
  trendingTV: any[];
  popularMovies: any[];
  popularTV: any[];
  topRatedMovies: any[];
  topRatedTV: any[];
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const initialCache = useMemo<HomeCache | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('flicklog-home-cache');
      if (!raw) return null;
      return JSON.parse(raw) as HomeCache;
    } catch (error) {
      console.warn('Failed to read home cache:', error);
      return null;
    }
  }, []);
  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>(() => initialCache?.watchingItems || []);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>(() => initialCache?.watchlistItems || []);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>(() => initialCache?.watchedItems || []);
  const [onHoldItems, setOnHoldItems] = useState<LibraryItem[]>(() => initialCache?.onHoldItems || []);
  const [droppedItems, setDroppedItems] = useState<LibraryItem[]>(() => initialCache?.droppedItems || []);
  const [rewatchItems, setRewatchItems] = useState<LibraryItem[]>(() => initialCache?.rewatchItems || []);
  const [nostalgiaItems, setClassicsItems] = useState<LibraryItem[]>(() => initialCache?.nostalgiaItems || []);
  const [favoritesItems, setFavoritesItems] = useState<LibraryItem[]>(() => initialCache?.favoritesItems || []);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [trendingMovies, setTrendingMovies] = useState<any[]>(() => initialCache?.trendingMovies || []);
  const [trendingTV, setTrendingTV] = useState<any[]>(() => initialCache?.trendingTV || []);
  const [popularMovies, setPopularMovies] = useState<any[]>(() => initialCache?.popularMovies || []);
  const [popularTV, setPopularTV] = useState<any[]>(() => initialCache?.popularTV || []);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>(() => initialCache?.topRatedMovies || []);
  const [topRatedTV, setTopRatedTV] = useState<any[]>(() => initialCache?.topRatedTV || []);
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>('all');

  useEffect(() => {
    if (status === 'authenticated') {
      const loadHome = async () => {
        if (initialCache) {
          setIsLoading(false);
          void refreshHomeCache();
          return;
        }

        setIsLoading(true);
        await refreshHomeCache();
        setIsLoading(false);
      };

      loadHome();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, initialCache]);

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

      const watchingData = watchingRes.ok ? await watchingRes.json() : {};
      const watchlistData = watchlistRes.ok ? await watchlistRes.json() : {};
      const watchedData = watchedRes.ok ? await watchedRes.json() : {};
      const onHoldData = onHoldRes.ok ? await onHoldRes.json() : {};
      const droppedData = droppedRes.ok ? await droppedRes.json() : {};
      const rewatchData = rewatchRes.ok ? await rewatchRes.json() : {};
      const nostalgiaData = nostalgiaRes.ok ? await nostalgiaRes.json() : {};
      const favoritesData = favoritesRes.ok ? await favoritesRes.json() : {};

      const nextState = {
        watchingItems: watchingData.items || watchingData.watching || [],
        watchlistItems: watchlistData.items || watchlistData.watchlist || [],
        watchedItems: watchedData.items || watchedData.watched || [],
        onHoldItems: onHoldData.items || onHoldData.onhold || [],
        droppedItems: droppedData.items || droppedData.dropped || [],
        rewatchItems: rewatchData.items || rewatchData.rewatch || [],
        nostalgiaItems: nostalgiaData.items || nostalgiaData.nostalgia || [],
        favoritesItems: favoritesData.favorites || [],
      };

      setWatchingItems(nextState.watchingItems);
      setWatchlistItems(nextState.watchlistItems);
      setWatchedItems(nextState.watchedItems);
      setOnHoldItems(nextState.onHoldItems);
      setDroppedItems(nextState.droppedItems);
      setRewatchItems(nextState.rewatchItems);
      setClassicsItems(nextState.nostalgiaItems);
      setFavoritesItems(nextState.favoritesItems);
      return nextState;
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Failed to fetch trending content');
      
      const data = await response.json();
      const nextState = {
        trendingMovies: data.trendingMovies || [],
        trendingTV: data.trendingTV || [],
        popularMovies: data.popularMovies || [],
        popularTV: data.popularTV || [],
        topRatedMovies: data.topRatedMovies || [],
        topRatedTV: data.topRatedTV || [],
      };

      setTrendingMovies(nextState.trendingMovies);
      setTrendingTV(nextState.trendingTV);
      setPopularMovies(nextState.popularMovies);
      setPopularTV(nextState.popularTV);
      setTopRatedMovies(nextState.topRatedMovies);
      setTopRatedTV(nextState.topRatedTV);
      return nextState;
    } catch (error) {
      console.error('Error fetching trending content:', error);
    }
  };

  const writeHomeCache = (cache: HomeCache) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('flicklog-home-cache', JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to write home cache:', error);
    }
  };

  const refreshHomeCache = async () => {
    const [libraryData, trendingData] = await Promise.all([fetchData(), fetchTrending()]);
    const merged: HomeCache = {
      ...(libraryData || {
        watchingItems: [],
        watchlistItems: [],
        watchedItems: [],
        onHoldItems: [],
        droppedItems: [],
        rewatchItems: [],
        nostalgiaItems: [],
        favoritesItems: [],
      }),
      ...(trendingData || {
        trendingMovies: [],
        trendingTV: [],
        popularMovies: [],
        popularTV: [],
        topRatedMovies: [],
        topRatedTV: [],
      }),
    };
    writeHomeCache(merged);
  };

  const watchingItem = watchingItems[0];
  const finishedItem = watchedItems[0];
  const watchlistItem = watchlistItems[0];
  const onHoldItem = onHoldItems[0];
  const droppedItem = droppedItems[0];
  const rewatchItem = rewatchItems[0];
  const nostalgiaItem = nostalgiaItems[0];
  const favoritesItem = favoritesItems[0];

  // Show loading while checking auth or redirecting
  if (status === 'loading' || status === 'unauthenticated') {
    return <HomeSkeleton />;
  }

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header with User Profile and Filter Pills */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div
          className="overflow-x-auto scrollbar-hide -mx-4"
          style={{ scrollPaddingLeft: '1rem' }}
        >
          <div className="flex items-center gap-2 px-4">
            {/* User Profile Circle */}
            <ProfileMenu />

            {/* Filter Pills */}
            <button
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === 'all' ? 'bg-[#8b5ef4] text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('movies')}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === 'movies' ? 'bg-[#8b5ef4] text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => setFilter('tv')}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === 'tv' ? 'bg-[#8b5ef4] text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              TV Shows
            </button>
            <div className="flex-shrink-0 w-1" />
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Your Lists Section */}
        <section className="mb-8">
          <h2 className="text-xl mb-1">Your Lists</h2>
          <div className="grid grid-cols-2 gap-2">
            {/* Watching */}
            <Link
              href="/library/watching"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={watchingItem?.poster_path ? getImageUrl(watchingItem.poster_path) : '/placeholders/place-holder-1.jpg'}
                  alt={watchingItem?.title || 'Watching'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Watching</h3>
            </Link>

            {/* Watchlist */}
            <Link
              href="/library/watchlist"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={watchlistItem?.poster_path ? getImageUrl(watchlistItem.poster_path) : '/placeholders/place-holder-2.jpg'}
                  alt={watchlistItem?.title || 'Watchlist'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Watchlist</h3>
            </Link>

            {/* Finished */}
            <Link
              href="/library/finished"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={finishedItem?.poster_path ? getImageUrl(finishedItem.poster_path) : '/placeholders/place-holder-3.jpg'}
                  alt={finishedItem?.title || 'Finished'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Finished</h3>
            </Link>

            {/* On Hold */}
            <Link
              href="/library/onhold"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={onHoldItem?.poster_path ? getImageUrl(onHoldItem.poster_path) : '/placeholders/place-holder-4.jpg'}
                  alt={onHoldItem?.title || 'On Hold'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">On Hold</h3>
            </Link>

            {/* Dropped */}
            <Link
              href="/library/dropped"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={droppedItem?.poster_path ? getImageUrl(droppedItem.poster_path) : '/placeholders/place-holder-5.jpg'}
                  alt={droppedItem?.title || 'Dropped'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Dropped</h3>
            </Link>

            {/* Rewatch */}
            <Link
              href="/library/rewatch"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={rewatchItem?.poster_path ? getImageUrl(rewatchItem.poster_path) : '/placeholders/place-holder-6.jpg'}
                  alt={rewatchItem?.title || 'Rewatch'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Rewatch</h3>
            </Link>

            {/* Classics */}
            <Link
              href="/library/nostalgia"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={nostalgiaItem?.poster_path ? getImageUrl(nostalgiaItem.poster_path) : '/placeholders/place-holder-7.jpg'}
                  alt={nostalgiaItem?.title || 'Classics'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Classics</h3>
            </Link>

            {/* Favorites */}
            <Link
              href="/library/favorites"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={favoritesItem?.poster_path ? getImageUrl(favoritesItem.poster_path) : '/placeholders/place-holder-8.jpg'}
                  alt={favoritesItem?.title || 'Favorites'}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <h3 className="font-semibold text-sm pr-2">Favorites</h3>
            </Link>
          </div>
        </section>

        {/* Trending Movies */}
        {trendingMovies.length > 0 && (filter === 'all' || filter === 'movies') && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl">Trending Movies</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
              style={{ scrollPaddingLeft: '1rem' }}
            >
              <div className="flex gap-3 px-4">
                {trendingMovies.map((movie: any) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {movie.release_date?.split('-')[0]}
                    </p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Trending TV Shows */}
        {trendingTV.length > 0 && (filter === 'all' || filter === 'tv') && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl">Trending TV Shows</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
              style={{ scrollPaddingLeft: '1rem' }}
            >
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
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {show.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {show.first_air_date?.split('-')[0]}
                    </p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Popular Movies */}
        {popularMovies.length > 0 && (filter === 'all' || filter === 'movies') && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl">Popular Movies</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
              style={{ scrollPaddingLeft: '1rem' }}
            >
              <div className="flex gap-3 px-4">
                {popularMovies.map((movie: any) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {movie.release_date?.split('-')[0]}
                    </p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Popular TV Shows */}
        {popularTV.length > 0 && (filter === 'all' || filter === 'tv') && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl">Popular TV Shows</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
              style={{ scrollPaddingLeft: '1rem' }}
            >
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
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {show.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {show.first_air_date?.split('-')[0]}
                    </p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Top Rated Movies */}
        {topRatedMovies.length > 0 && (filter === 'all' || filter === 'movies') && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl">Top Rated Movies</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
              style={{ scrollPaddingLeft: '1rem' }}
            >
              <div className="flex gap-3 px-4">
                {topRatedMovies.map((movie: any) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          className="object-cover group-hover:opacity-75 transition"
                          sizes="40vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {movie.release_date?.split('-')[0]}
                    </p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Top Rated TV Shows */}
        {topRatedTV.length > 0 && (filter === 'all' || filter === 'tv') && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl">Top Rated TV Shows</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
              style={{ scrollPaddingLeft: '1rem' }}
            >
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
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {show.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {show.first_air_date?.split('-')[0]}
                    </p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Popular Lists Section (Placeholder) */}
        <section className="mb-8">
          <h2 className="text-xl mb-1">Popular Lists</h2>
          <div className="space-y-3">
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="font-semibold mb-1">Best Sci-Fi of All Time</h3>
              <p className="text-sm text-gray-400">by @moviebuff • 50 items</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="font-semibold mb-1">Must-Watch Horror Movies</h3>
              <p className="text-sm text-gray-400">by @scaryfilms • 35 items</p>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <h3 className="font-semibold mb-1">Top 10 Comedies 2025</h3>
              <p className="text-sm text-gray-400">by @laughoutloud • 10 items</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
