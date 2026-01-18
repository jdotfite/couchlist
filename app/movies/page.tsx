'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';
import { getImageUrl } from '@/lib/tmdb';
import { Loader2, Plus } from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

interface MoviesCache {
  watchingItems: LibraryItem[];
  watchlistItems: LibraryItem[];
  watchedItems: LibraryItem[];
  onHoldItems: LibraryItem[];
  droppedItems: LibraryItem[];
  rewatchItems: LibraryItem[];
  nostalgiaItems: LibraryItem[];
  favoritesItems: LibraryItem[];
  trendingMovies: any[];
  popularMovies: any[];
  topRatedMovies: any[];
}

export default function MoviesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const initialCache = useMemo<MoviesCache | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('flicklog-movies-cache');
      if (!raw) return null;
      return JSON.parse(raw) as MoviesCache;
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
  const [trendingMovies, setTrendingMovies] = useState<any[]>(() => initialCache?.trendingMovies || []);
  const [popularMovies, setPopularMovies] = useState<any[]>(() => initialCache?.popularMovies || []);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>(() => initialCache?.topRatedMovies || []);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
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

      // Filter to only movies
      const filterMovies = (items: LibraryItem[]) => items.filter(item => item.media_type === 'movie');

      const nextState = {
        watchingItems: filterMovies(watching),
        watchlistItems: filterMovies(watchlist),
        watchedItems: filterMovies(watched),
        onHoldItems: filterMovies(onHold),
        droppedItems: filterMovies(dropped),
        rewatchItems: filterMovies(rewatch),
        nostalgiaItems: filterMovies(nostalgia),
        favoritesItems: filterMovies(favorites),
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
        trendingMovies: data.trendingMovies || [],
        popularMovies: data.popularMovies || [],
        topRatedMovies: data.topRatedMovies || [],
      };

      setTrendingMovies(nextState.trendingMovies);
      setPopularMovies(nextState.popularMovies);
      setTopRatedMovies(nextState.topRatedMovies);
      return nextState;
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      return null;
    }
  };

  const writeCache = (cache: MoviesCache) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('flicklog-movies-cache', JSON.stringify(cache));
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

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin" />
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <ProfileMenu />
          <h1 className="text-2xl font-bold">Movies</h1>
        </div>
      </header>

      <main className="px-4 pt-2">
        {/* Your Movie Lists */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your Lists</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/movies/watching"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={watchingItem?.poster_path ? getImageUrl(watchingItem.poster_path) : '/placeholders/place-holder-1.jpg'}
                  alt="Watching"
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Watching</h3>
                <p className="text-xs text-gray-400">{watchingItems.length} movies</p>
              </div>
            </Link>

            <Link
              href="/movies/watchlist"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={watchlistItem?.poster_path ? getImageUrl(watchlistItem.poster_path) : '/placeholders/place-holder-2.jpg'}
                  alt="Watchlist"
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Watchlist</h3>
                <p className="text-xs text-gray-400">{watchlistItems.length} movies</p>
              </div>
            </Link>

            <Link
              href="/movies/finished"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={finishedItem?.poster_path ? getImageUrl(finishedItem.poster_path) : '/placeholders/place-holder-3.jpg'}
                  alt="Finished"
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Finished</h3>
                <p className="text-xs text-gray-400">{watchedItems.length} movies</p>
              </div>
            </Link>

            <Link
              href="/movies/all"
              className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
            >
              <div className="relative w-16 h-16 flex-shrink-0 bg-zinc-800">
                <Image
                  src={onHoldItem?.poster_path ? getImageUrl(onHoldItem.poster_path) : '/placeholders/place-holder-4.jpg'}
                  alt="All Lists"
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
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
              <Link href="/movies/watching" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {watchingItems.slice(0, 10).map((movie) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.media_id}`}
                    className="group flex-shrink-0 snap-start"
                    style={{ width: 'calc(40% - 6px)' }}
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      <Image
                        src={movie.poster_path ? getImageUrl(movie.poster_path) : '/placeholders/place-holder-1.jpg'}
                        alt={movie.title}
                        fill
                        className="object-cover group-hover:opacity-75 transition"
                        sizes="40vw"
                      />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{movie.title}</h3>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Trending Movies */}
        {trendingMovies.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Trending Movies</h2>
              <Link href="/discover?filter=movies" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
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

                      <button
                        onClick={(e) => handleAddClick(e, {
                          id: movie.id,
                          media_type: 'movie',
                          title: movie.title,
                          poster_path: movie.poster_path,
                        })}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{movie.title}</h3>
                    <p className="text-xs text-gray-400">{movie.release_date?.split('-')[0]}</p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Popular Movies */}
        {popularMovies.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Popular Movies</h2>
              <Link href="/discover?filter=movies" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
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

                      <button
                        onClick={(e) => handleAddClick(e, {
                          id: movie.id,
                          media_type: 'movie',
                          title: movie.title,
                          poster_path: movie.poster_path,
                        })}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{movie.title}</h3>
                    <p className="text-xs text-gray-400">{movie.release_date?.split('-')[0]}</p>
                  </Link>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        )}

        {/* Top Rated Movies */}
        {topRatedMovies.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Top Rated Movies</h2>
              <Link href="/discover?filter=movies" className="text-sm text-gray-400 hover:text-white">
                See all
              </Link>
            </div>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
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

                      <button
                        onClick={(e) => handleAddClick(e, {
                          id: movie.id,
                          media_type: 'movie',
                          title: movie.title,
                          poster_path: movie.poster_path,
                        })}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{movie.title}</h3>
                    <p className="text-xs text-gray-400">{movie.release_date?.split('-')[0]}</p>
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
          mediaType="movie"
          title={selectedItem.title}
          posterPath={selectedItem.poster_path}
        />
      )}
    </div>
  );
}
