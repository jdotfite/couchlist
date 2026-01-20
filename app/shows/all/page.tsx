'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Play, List, CheckCircle2, PauseCircle, XCircle, RotateCcw, Sparkles, Heart, ChevronLeft, Settings, Plus, Grid3X3, LayoutList, Users, ChevronRight, ChevronDown } from 'lucide-react';
import AllListsSkeleton from '@/components/AllListsSkeleton';
import ListSettingsSheet from '@/components/ListSettingsSheet';
import CreateListModal from '@/components/custom-lists/CreateListModal';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences } from '@/hooks/useListPreferences';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

interface CustomListItem {
  media_id: number;
  title: string;
  poster_path: string;
  media_type: string;
}

interface CustomList {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  item_count: number;
  items: CustomListItem[];
}

export default function AllShowsListsPage() {
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
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [sharedLists, setSharedLists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showMoreLists, setShowMoreLists] = useState(false);
  const { getListName, isListHidden, refetch: refetchPreferences } = useListPreferences();

  // Core lists that are always shown
  const CORE_LISTS = ['watching', 'watchlist', 'finished'];

  // Load saved layout preference
  useEffect(() => {
    const savedLayout = localStorage.getItem('showListsLayout');
    if (savedLayout === 'list' || savedLayout === 'grid') {
      setLayout(savedLayout);
    }
  }, []);

  const handleLayoutChange = (newLayout: 'grid' | 'list') => {
    setLayout(newLayout);
    localStorage.setItem('showListsLayout', newLayout);
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
        watchingRes, watchlistRes, watchedRes, onHoldRes,
        droppedRes, rewatchRes, nostalgiaRes, favoritesRes, customListsRes, sharedListsRes
      ] = await Promise.all([
        fetch('/api/watching'),
        fetch('/api/watchlist'),
        fetch('/api/watched'),
        fetch('/api/onhold'),
        fetch('/api/dropped'),
        fetch('/api/rewatch'),
        fetch('/api/nostalgia'),
        fetch('/api/favorites'),
        fetch('/api/custom-lists?mediaType=tv'),
        fetch('/api/collaborators/shared-lists')
      ]);

      const parseRes = async (res: Response, key: string) => {
        if (!res.ok) return [];
        const data = await res.json();
        const items = data.items || data[key] || [];
        return items.filter((item: LibraryItem) => item.media_type === 'tv');
      };

      setWatchingItems(await parseRes(watchingRes, 'watching'));
      setWatchlistItems(await parseRes(watchlistRes, 'watchlist'));
      setWatchedItems(await parseRes(watchedRes, 'watched'));
      setOnHoldItems(await parseRes(onHoldRes, 'onhold'));
      setDroppedItems(await parseRes(droppedRes, 'dropped'));
      setRewatchItems(await parseRes(rewatchRes, 'rewatch'));
      setNostalgiaItems(await parseRes(nostalgiaRes, 'nostalgia'));

      const favoritesData = await favoritesRes.json().catch(() => ({}));
      const favorites = (favoritesData.favorites || []).filter((item: LibraryItem) => item.media_type === 'tv');
      setFavoritesItems(favorites);

      // Parse custom lists
      const customListsData = await customListsRes.json().catch(() => ({ lists: [] }));
      setCustomLists(customListsData.lists || []);

      // Parse shared lists
      const sharedListsData = await sharedListsRes.json().catch(() => ({ sharedLists: [] }));
      setSharedLists(sharedListsData.sharedLists || []);
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleListCreated = (list: CustomList) => {
    // Refresh data to show the new list if it has items
    fetchData();
  };

  if (status === 'loading' || isLoading) {
    return <AllListsSkeleton />;
  }

  const allSystemLists = [
    { slug: 'watching', title: getListName('watching') || 'Watching', items: watchingItems, icon: Play, color: 'from-emerald-500 to-emerald-900', isCore: true },
    { slug: 'watchlist', title: getListName('watchlist') || 'Watchlist', items: watchlistItems, icon: List, color: 'from-blue-600 to-blue-900', isCore: true },
    { slug: 'finished', title: getListName('finished') || 'Finished', items: watchedItems, icon: CheckCircle2, color: 'from-brand-primary to-brand-primary-darker', isCore: true },
    { slug: 'onhold', title: getListName('onhold') || 'On Hold', items: onHoldItems, icon: PauseCircle, color: 'from-yellow-500 to-yellow-900', isCore: false },
    { slug: 'dropped', title: getListName('dropped') || 'Dropped', items: droppedItems, icon: XCircle, color: 'from-red-600 to-red-900', isCore: false },
    { slug: 'rewatch', title: getListName('rewatch') || 'Rewatch', items: rewatchItems, icon: RotateCcw, color: 'from-cyan-500 to-cyan-900', isCore: false },
    { slug: 'nostalgia', title: getListName('nostalgia') || 'Classics', items: nostalgiaItems, icon: Sparkles, color: 'from-amber-500 to-amber-900', isCore: false },
    { slug: 'favorites', title: getListName('favorites') || 'Favorites', items: favoritesItems, icon: Heart, color: 'from-pink-600 to-pink-900', isCore: false },
  ];

  // Filter out hidden lists, then separate into visible and more lists
  const visibleSystemLists = allSystemLists.filter(list => !isListHidden(list.slug));

  // Core lists are always shown, secondary lists only if they have items OR showMoreLists is true
  const coreLists = visibleSystemLists.filter(list => list.isCore);
  const secondaryLists = visibleSystemLists.filter(list => !list.isCore);
  const populatedSecondaryLists = secondaryLists.filter(list => list.items.length > 0);
  const emptySecondaryLists = secondaryLists.filter(list => list.items.length === 0);

  // Show core + populated secondary, then empty secondary only if expanded
  const lists = [
    ...coreLists,
    ...populatedSecondaryLists,
    ...(showMoreLists ? emptySecondaryLists : [])
  ];

  const hasHiddenEmptyLists = emptySecondaryLists.length > 0;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/shows" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">All TV Lists</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => handleLayoutChange('list')}
                className={`p-2 rounded-md transition ${
                  layout === 'list' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleLayoutChange('grid')}
                className={`p-2 rounded-md transition ${
                  layout === 'grid' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-full transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {layout === 'grid' ? (<>
          <div className="grid grid-cols-2 gap-3">
            {/* System Lists - Grid View */}
            {lists.map(({ slug, title, items, icon: Icon, color }) => {
              const isShared = sharedLists.includes(slug);
              return (
                <Link
                  key={slug}
                  href={`/shows/${slug}`}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br ${color}`}
                >
                  {items[0]?.poster_path && (
                    <Image
                      src={getImageUrl(items[0].poster_path)}
                      alt={title}
                      fill
                      className="object-cover object-top opacity-60"
                      sizes="50vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Icon className="w-6 h-6" />
                      {isShared && (
                        <div className="bg-black/50 rounded-full p-1.5">
                          <Users className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg mb-1">{title}</h3>
                      <p className="text-sm text-gray-200">{items.length} shows</p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Custom Lists - Grid View */}
            {customLists.map((list) => {
              const IconComponent = getIconComponent(list.icon);
              const colorValue = getColorValue(list.color);
              const firstItem = list.items[0];

              return (
                <Link
                  key={`custom-${list.slug}`}
                  href={`/lists/${list.slug}`}
                  className="relative aspect-square rounded-lg overflow-hidden"
                  style={{ backgroundColor: `${colorValue}30` }}
                >
                  {firstItem?.poster_path && (
                    <Image
                      src={getImageUrl(firstItem.poster_path)}
                      alt={list.name}
                      fill
                      className="object-cover object-top opacity-60"
                      sizes="50vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <IconComponent className="w-6 h-6" style={{ color: colorValue }} />
                    <div>
                      <h3 className="text-lg mb-1">{list.name}</h3>
                      <p className="text-sm text-gray-200">{list.item_count} shows</p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Create New List Card - Grid View */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white"
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm">Create List</span>
            </button>
          </div>

          {/* Show More Lists Toggle - Grid View */}
          {hasHiddenEmptyLists && (
            <button
              onClick={() => setShowMoreLists(!showMoreLists)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-white transition"
            >
              {showMoreLists ? (
                <>
                  <ChevronDown className="w-4 h-4 rotate-180" />
                  Hide empty lists
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {emptySecondaryLists.length} more {emptySecondaryLists.length === 1 ? 'list' : 'lists'}
                </>
              )}
            </button>
          )}
        </>) : (
          <div className="space-y-1">
            {/* System Lists - List View */}
            {lists.map(({ slug, title, items, icon: Icon, color }) => {
              const isShared = sharedLists.includes(slug);
              return (
                <Link
                  key={slug}
                  href={`/shows/${slug}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition"
                >
                  {/* Poster thumbnail */}
                  <div className="relative w-12 h-[68px] flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                    {items[0]?.poster_path ? (
                      <Image
                        src={getImageUrl(items[0].poster_path)}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
                      {isShared && <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400">{items.length} shows</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                </Link>
              );
            })}

            {/* Custom Lists - List View */}
            {customLists.map((list) => {
              const IconComponent = getIconComponent(list.icon);
              const colorValue = getColorValue(list.color);
              const firstItem = list.items[0];

              return (
                <Link
                  key={`custom-${list.slug}`}
                  href={`/lists/${list.slug}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition"
                >
                  {/* Poster thumbnail */}
                  <div className="relative w-12 h-[68px] flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                    {firstItem?.poster_path ? (
                      <Image
                        src={getImageUrl(firstItem.poster_path)}
                        alt={list.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${colorValue}20` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: colorValue }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1">{list.name}</h3>
                    <p className="text-xs text-gray-400">{list.item_count} shows</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                </Link>
              );
            })}

            {/* Create New List - List View */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full flex items-center gap-3 p-2 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition text-gray-400 hover:text-white"
            >
              <div className="w-12 h-[68px] rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">Create List</span>
            </button>

            {/* Show More Lists Toggle - List View */}
            {hasHiddenEmptyLists && (
              <button
                onClick={() => setShowMoreLists(!showMoreLists)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-white transition"
              >
                {showMoreLists ? (
                  <>
                    <ChevronDown className="w-4 h-4 rotate-180" />
                    Hide empty lists
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {emptySecondaryLists.length} more {emptySecondaryLists.length === 1 ? 'list' : 'lists'}
                  </>
                )}
              </button>
            )}
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
        onCreateList={() => setIsCreateOpen(true)}
        mediaType="tv"
      />

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleListCreated}
      />
    </div>
  );
}
