'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, List, Heart, Sparkles, Loader2 } from 'lucide-react';
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
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>([]);
  const [favoritesItems, setFavoritesItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingMovies, setTrendingMovies] = useState<any[]>([]);
  const [trendingTV, setTrendingTV] = useState<any[]>([]);
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [popularTV, setPopularTV] = useState<any[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
    fetchTrending();
  }, [status]);

  const fetchData = async () => {
    try {
      const [watchlistRes, watchedRes, favoritesRes] = await Promise.all([
        fetch('/api/watchlist'),
        fetch('/api/watched'),
        fetch('/api/favorites')
      ]);

      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlistItems(data.items || data.watchlist || []);
      }

      if (watchedRes.ok) {
        const data = await watchedRes.json();
        setWatchedItems(data.items || data.watched || []);
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

  const recentItem = watchedItems[0];
  const watchlistItem = watchlistItems[0];
  const favoritesItem = favoritesItems[0];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header with User Profile and Filter Pills */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* User Profile Circle */}
          <ProfileMenu />
          
          {/* Filter Pills */}
          <button className="flex-shrink-0 bg-green-600 text-white rounded-full px-4 py-2 text-sm font-semibold">
            All
          </button>
          <button className="flex-shrink-0 bg-zinc-800 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-zinc-700 transition">
            Watching
          </button>
          <button className="flex-shrink-0 bg-zinc-800 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-zinc-700 transition">
            Watchlist
          </button>
          <button className="flex-shrink-0 bg-zinc-800 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-zinc-700 transition">
            Completed
          </button>
          <button className="flex-shrink-0 bg-zinc-800 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-zinc-700 transition">
            Popular Lists
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Your Lists Section */}
        <section className="mb-8">
          <h2 className="text-2xl mb-4">Your Lists</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Watched */}
              <Link
                href="/library/watched"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  {recentItem ? (
                    <Image
                      src={recentItem.poster_path}
                      alt={recentItem.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm pr-2">Watched</h3>
              </Link>

              {/* Watchlist */}
              <Link
                href="/library/watchlist"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  {watchlistItem ? (
                    <Image
                      src={watchlistItem.poster_path}
                      alt={watchlistItem.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <List className="w-6 h-6 text-blue-500" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm pr-2">Watchlist</h3>
              </Link>

              {/* Recommended */}
              <Link
                href="/library/recommended"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm pr-2">Recommended</h3>
              </Link>

              {/* Favorites */}
              <Link
                href="/library/favorites"
                className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
              >
                <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                  {favoritesItem ? (
                    <Image
                      src={favoritesItem.poster_path}
                      alt={favoritesItem.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-6 h-6 text-pink-500" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm pr-2">Favorites</h3>
              </Link>
            </div>
          )}
        </section>

        {/* Trending Movies */}
        {trendingMovies.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl">Trending Movies</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-4">
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
            </div>
          </section>
        )}

        {/* Trending TV Shows */}
        {trendingTV.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl">Trending TV Shows</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-4">
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
            </div>
          </section>
        )}

        {/* Popular Movies */}
        {popularMovies.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl">Popular Movies</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-4">
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
            </div>
          </section>
        )}

        {/* Popular TV Shows */}
        {popularTV.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl">Popular TV Shows</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-4">
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
            </div>
          </section>
        )}

        {/* Top Rated Movies */}
        {topRatedMovies.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl">Top Rated Movies</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-4">
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
            </div>
          </section>
        )}

        {/* Top Rated TV Shows */}
        {topRatedTV.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl">Top Rated TV Shows</h2>
              <Link href="/search" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pl-4">
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
            </div>
          </section>
        )}

        {/* Popular Lists Section (Placeholder) */}
        <section className="mb-8">
          <h2 className="text-2xl mb-4">Popular Lists</h2>
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
