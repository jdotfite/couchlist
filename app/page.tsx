'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>([]);
  const [onHoldItems, setOnHoldItems] = useState<LibraryItem[]>([]);
  const [droppedItems, setDroppedItems] = useState<LibraryItem[]>([]);
  const [rewatchItems, setRewatchItems] = useState<LibraryItem[]>([]);
  const [nostalgiaItems, setNostalgiaItems] = useState<LibraryItem[]>([]);
  const [favoritesItems, setFavoritesItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [popularTV, setPopularTV] = useState<any[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>('all');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      fetchTrending();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
        setWatchlistItems(data.items || data.watchlist || []);
      }

      if (watchedRes.ok) {
        const data = await watchedRes.json();
        setWatchedItems(data.items || data.watched || []);
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
        setNostalgiaItems(data.items || data.nostalgia || []);
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

  const fetchTrending = async () => {
    try {
      const response = await fetch('/api/trending');
      if (!response.ok) throw new Error('Failed to fetch trending content');
      
      const data = await response.json();
      setTrendingMovies(data.trendingMovies || []);
      setTrendingTV(data.trendingTV || []);
      setPopularMovies(data.popularMovies || []);
      setPopularTV(data.popularTV || []);
      setTopRatedMovies(data.topRatedMovies || []);
      setTopRatedTV(data.topRatedTV || []);
    } catch (error) {
      console.error('Error fetching trending content:', error);
    }
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
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8b5ef4]" />
      </div>
    );
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Watching */}
              <Link
                href="/library/watching"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  <Image
                    src={watchingItem?.poster_path || '/placeholders/place-holder-1.jpg'}
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
                    src={watchlistItem?.poster_path || '/placeholders/place-holder-2.jpg'}
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
                    src={finishedItem?.poster_path || '/placeholders/place-holder-3.jpg'}
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
                    src={onHoldItem?.poster_path || '/placeholders/place-holder-4.jpg'}
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
                    src={droppedItem?.poster_path || '/placeholders/place-holder-5.jpg'}
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
                    src={rewatchItem?.poster_path || '/placeholders/place-holder-6.jpg'}
                    alt={rewatchItem?.title || 'Rewatch'}
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                </div>
                <h3 className="font-semibold text-sm pr-2">Rewatch</h3>
              </Link>

              {/* Nostalgia */}
              <Link
                href="/library/nostalgia"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  <Image
                    src={nostalgiaItem?.poster_path || '/placeholders/place-holder-7.jpg'}
                    alt={nostalgiaItem?.title || 'Nostalgia'}
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                </div>
                <h3 className="font-semibold text-sm pr-2">Nostalgia</h3>
              </Link>

              {/* Favorites */}
              <Link
                href="/library/favorites"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  <Image
                    src={favoritesItem?.poster_path || '/placeholders/place-holder-8.jpg'}
                    alt={favoritesItem?.title || 'Favorites'}
                    fill
                    className="object-cover object-top"
                    sizes="64px"
                  />
                </div>
                <h3 className="font-semibold text-sm pr-2">Favorites</h3>
              </Link>
            </div>
          )}
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
