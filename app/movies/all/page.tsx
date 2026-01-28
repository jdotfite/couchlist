'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Play, List, CheckCircle2, ChevronLeft, Settings, Users, ChevronRight, Settings2 } from 'lucide-react';
import LayoutToggle, { LayoutOption } from '@/components/ui/LayoutToggle';
import AllListsSkeleton from '@/components/AllListsSkeleton';
import ListSettingsSheet from '@/components/ListSettingsSheet';
import ListCardSettingsSheet from '@/components/ListCardSettingsSheet';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences, type ListCardSettings } from '@/hooks/useListPreferences';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

export default function AllMoviesListsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [watchingItems, setWatchingItems] = useState<LibraryItem[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<LibraryItem[]>([]);
  const [watchedItems, setWatchedItems] = useState<LibraryItem[]>([]);
  const [sharedLists, setSharedLists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutOption>('grid');
  const { getListName, isListHidden, getListCardSettings, updateListCardSettings, refetch: refetchPreferences } = useListPreferences();
  const [cardSettingsOpen, setCardSettingsOpen] = useState<string | null>(null);
  const [cardSettingsKind, setCardSettingsKind] = useState<'system' | 'custom'>('system');

  // Core lists that are always shown
  const CORE_LISTS = ['watching', 'watchlist', 'finished'];

  // Load saved layout preference
  useEffect(() => {
    const savedLayout = localStorage.getItem('movieListsLayout');
    if (savedLayout === 'list' || savedLayout === 'grid') {
      setLayout(savedLayout);
    }
  }, []);

  const handleLayoutChange = (newLayout: LayoutOption) => {
    setLayout(newLayout);
    localStorage.setItem('movieListsLayout', newLayout);
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [
        watchingRes, watchlistRes, watchedRes, sharedListsRes
      ] = await Promise.all([
        fetch('/api/watching'),
        fetch('/api/watchlist'),
        fetch('/api/watched'),
        fetch('/api/collaborators/shared-lists')
      ]);

      const parseRes = async (res: Response, key: string) => {
        if (!res.ok) return [];
        const data = await res.json();
        const items = data.items || data[key] || [];
        return items.filter((item: LibraryItem) => item.media_type === 'movie');
      };

      setWatchingItems(await parseRes(watchingRes, 'watching'));
      setWatchlistItems(await parseRes(watchlistRes, 'watchlist'));
      setWatchedItems(await parseRes(watchedRes, 'watched'));

      // Parse shared lists
      const sharedListsData = await sharedListsRes.json().catch(() => ({ sharedLists: [] }));
      setSharedLists(sharedListsData.sharedLists || []);
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <AllListsSkeleton />;
  }

  const allSystemLists = [
    { slug: 'watching', title: getListName('watching') || 'Watching', items: watchingItems, icon: Play, color: 'from-emerald-500 to-emerald-900', colorHex: '#10b981' },
    { slug: 'watchlist', title: getListName('watchlist') || 'Watchlist', items: watchlistItems, icon: List, color: 'from-blue-600 to-blue-900', colorHex: '#3b82f6' },
    { slug: 'finished', title: getListName('finished') || 'Watched', items: watchedItems, icon: CheckCircle2, color: 'from-brand-primary to-brand-primary-darker', colorHex: '#8b5ef4' },
  ];

  // Helper to get the cover image for a list based on its settings
  const getListCoverInfo = (listSlug: string, items: LibraryItem[], listColor: string) => {
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

  const handleOpenCardSettings = (e: React.MouseEvent, listSlug: string, kind: 'system' | 'custom') => {
    e.preventDefault();
    e.stopPropagation();
    setCardSettingsOpen(listSlug);
    setCardSettingsKind(kind);
  };

  const handleSaveCardSettings = async (listSlug: string, settings: Partial<ListCardSettings>) => {
    return await updateListCardSettings(listSlug, settings);
  };

  // Filter out hidden lists
  const lists = allSystemLists.filter(list => !isListHidden(list.slug));

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/movies" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">All Movie Lists</h1>
          </div>
          <div className="flex items-center gap-2">
            <LayoutToggle layout={layout} onLayoutChange={handleLayoutChange} />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-full transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4">
        {layout === 'grid' ? (<>
          <div className="grid grid-cols-2 gap-3">
            {/* System Lists - Grid View */}
            {lists.map(({ slug, title, items, icon: Icon, color, colorHex }) => {
              const isShared = sharedLists.includes(slug);
              const coverInfo = getListCoverInfo(slug, items, colorHex);
              const settings = getListCardSettings(slug);

              return (
                <Link
                  key={slug}
                  href={`/movies/${slug}`}
                  className={`group relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br ${color}`}
                >
                  {coverInfo.type === 'image' && (
                    <Image
                      src={getImageUrl(coverInfo.posterPath)}
                      alt={title}
                      fill
                      className="object-cover object-top opacity-60"
                      sizes="50vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      {(coverInfo.type === 'color' && coverInfo.showIcon) || coverInfo.type === 'image' ? (
                        <Icon className="w-6 h-6" />
                      ) : (
                        <div />
                      )}
                      <div className="flex items-center gap-1">
                        {isShared && (
                          <div className="bg-black/50 rounded-full p-1.5">
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                        <button
                          onClick={(e) => handleOpenCardSettings(e, slug, 'system')}
                          className="bg-black/50 rounded-full p-1.5 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg mb-1">{title}</h3>
                      <p className="text-sm text-gray-200">{items.length} movies</p>
                    </div>
                  </div>
                </Link>
              );
            })}

          </div>
        </>) : (
          <div className="space-y-1">
            {/* System Lists - List View */}
            {lists.map(({ slug, title, items, icon: Icon, color, colorHex }) => {
              const isShared = sharedLists.includes(slug);
              const coverInfo = getListCoverInfo(slug, items, colorHex);

              return (
                <div key={slug} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition">
                  <Link
                    href={`/movies/${slug}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {/* Poster thumbnail */}
                    <div className={`relative w-12 h-[68px] flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br ${color}`}>
                      {coverInfo.type === 'image' ? (
                        <Image
                          src={getImageUrl(coverInfo.posterPath)}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : coverInfo.showIcon ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
                        {isShared && <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400">{items.length} movies</p>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => handleOpenCardSettings(e, slug, 'system')}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-opacity flex-shrink-0"
                  >
                    <Settings2 className="w-4 h-4 text-gray-400" />
                  </button>
                  <Link href={`/movies/${slug}`}>
                    <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Settings Sheet */}
      <ListSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          refetchPreferences();
        }}
        mediaType="movie"
      />

      {/* List Card Settings Sheet */}
      {cardSettingsOpen && (() => {
        const listData = allSystemLists.find(l => l.slug === cardSettingsOpen);
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
            onSave={(newSettings) => handleSaveCardSettings(cardSettingsOpen, newSettings)}
          />
        );
      })()}
    </div>
  );
}
