'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { getImageUrl } from '@/lib/tmdb';
import { Plus, Play, List, CheckCircle2, LayoutGrid, Settings2 } from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import ListCardSettingsSheet from '@/components/ListCardSettingsSheet';
import LibraryDashboardSkeleton from '@/components/LibraryDashboardSkeleton';
import { useListPreferences, type ListCardSettings } from '@/hooks/useListPreferences';

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
  const [cardSettingsOpen, setCardSettingsOpen] = useState<string | null>(null);
  const { getListName, getListCardSettings, updateListCardSettings } = useListPreferences();

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

  if (status === 'loading' || status === 'unauthenticated' || isLoading) {
    return <LibraryDashboardSkeleton />;
  }

  // Dashboard list data
  const dashboardLists = [
    { slug: 'watching', title: getListName('watching') || 'Watching', items: watchingItems, icon: Play, color: 'from-emerald-500 to-emerald-900', colorHex: '#10b981' },
    { slug: 'watchlist', title: getListName('watchlist') || 'Watchlist', items: watchlistItems, icon: List, color: 'from-blue-600 to-blue-900', colorHex: '#3b82f6' },
    { slug: 'finished', title: getListName('finished') || 'Finished', items: watchedItems, icon: CheckCircle2, color: 'from-brand-primary to-brand-primary-darker', colorHex: '#8b5ef4' },
  ];

  // Helper to get cover image based on settings
  const getListCoverInfo = (listSlug: string, items: LibraryItem[]) => {
    const settings = getListCardSettings(listSlug);

    if (settings.coverType === 'color') {
      return { type: 'color' as const, showIcon: settings.showIcon };
    }

    if (settings.coverType === 'specific_item' && settings.coverMediaId) {
      const item = items.find(i => i.media_id === settings.coverMediaId);
      if (item?.poster_path) {
        return { type: 'image' as const, posterPath: item.poster_path };
      }
    }

    // Default: last_added (first item)
    if (items[0]?.poster_path) {
      return { type: 'image' as const, posterPath: items[0].poster_path };
    }

    return { type: 'color' as const, showIcon: true };
  };

  const handleOpenCardSettings = (e: React.MouseEvent, listSlug: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCardSettingsOpen(listSlug);
  };

  const handleSaveCardSettings = async (settings: Partial<ListCardSettings>) => {
    if (!cardSettingsOpen) return false;
    return await updateListCardSettings(cardSettingsOpen, settings);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileMenu />
            <h1 className="text-2xl font-bold">Movies</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pt-2">
        {/* Your Movie Lists */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your Lists</h2>
          <div className="grid grid-cols-2 gap-2">
            {dashboardLists.map(({ slug, title, items, icon: Icon, color, colorHex }) => {
              const coverInfo = getListCoverInfo(slug, items);

              return (
                <Link
                  key={slug}
                  href={`/movies/${slug}`}
                  className="group flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
                >
                  <div className={`relative w-16 h-16 flex-shrink-0 bg-gradient-to-br ${color}`}>
                    {coverInfo.type === 'image' ? (
                      <Image
                        src={getImageUrl(coverInfo.posterPath)}
                        alt={title}
                        fill
                        className="object-cover object-top"
                        sizes="64px"
                      />
                    ) : coverInfo.showIcon ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white/80" />
                      </div>
                    ) : null}
                    <button
                      onClick={(e) => handleOpenCardSettings(e, slug)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <p className="text-xs text-gray-400">{items.length} movies</p>
                  </div>
                </Link>
              );
            })}

            <Link
              href="/movies/all"
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
                  <div className="w-full h-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6 text-white/80" />
                  </div>
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

      {/* List Card Settings Sheet */}
      {cardSettingsOpen && (() => {
        const listData = dashboardLists.find(l => l.slug === cardSettingsOpen);
        if (!listData) return null;
        const settings = getListCardSettings(cardSettingsOpen);
        return (
          <ListCardSettingsSheet
            isOpen={true}
            onClose={() => setCardSettingsOpen(null)}
            listType={cardSettingsOpen}
            listKind="system"
            listName={listData.title}
            listColor={listData.colorHex}
            listIcon={listData.icon}
            items={listData.items.map(i => ({
              mediaId: i.media_id,
              posterPath: i.poster_path,
              title: i.title,
            }))}
            settings={settings}
            onSave={handleSaveCardSettings}
          />
        );
      })()}
    </div>
  );
}
