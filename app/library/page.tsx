'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MoreVertical, Grid3X3, List, Settings2, Film, Tv,
  Heart, Star, ChevronDown
} from 'lucide-react';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import EmptyState from '@/components/EmptyState';
import MediaListSkeleton from '@/components/MediaListSkeleton';
import { getImageUrl } from '@/lib/tmdb';
import { useListPreferences } from '@/hooks/useListPreferences';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  added_date?: string;
  watched_date?: string;
  rating?: number;
  is_favorite?: boolean;
  status?: string;
}

type LayoutType = 'list' | 'grid';
type TypeFilter = 'all' | 'movie' | 'tv';
type StatusFilter = 'all' | 'watching' | 'watchlist' | 'finished' | 'onhold' | 'dropped';

const statusLabels: Record<StatusFilter, string> = {
  all: 'All Statuses',
  watching: 'Watching',
  watchlist: 'Watchlist',
  finished: 'Finished',
  onhold: 'On Hold',
  dropped: 'Dropped',
};

function LibraryPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getListName } = useListPreferences();

  // URL params
  const initialType = (searchParams.get('type') || 'all') as TypeFilter;
  const initialStatus = (searchParams.get('status') || 'all') as StatusFilter;

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutType>('grid');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (typeFilter !== 'all' && item.media_type !== typeFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, typeFilter, statusFilter]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const queryString = params.toString();
    const newUrl = queryString ? `/library?${queryString}` : '/library';
    router.replace(newUrl, { scroll: false });
  }, [typeFilter, statusFilter, router]);

  // Fetch all library items
  useEffect(() => {
    if (status === 'authenticated') {
      fetchLibrary();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      // Fetch all statuses in parallel
      const [watchingRes, watchlistRes, finishedRes, onholdRes, droppedRes] = await Promise.all([
        fetch('/api/watching'),
        fetch('/api/watchlist'),
        fetch('/api/watched'),
        fetch('/api/onhold'),
        fetch('/api/dropped'),
      ]);

      const parseRes = async (res: Response, statusValue: string) => {
        if (!res.ok) return [];
        const data = await res.json();
        const items = data.items || [];
        return items.map((item: LibraryItem) => ({ ...item, status: statusValue }));
      };

      const watching = await parseRes(watchingRes, 'watching');
      const watchlist = await parseRes(watchlistRes, 'watchlist');
      const finished = await parseRes(finishedRes, 'finished');
      const onhold = await parseRes(onholdRes, 'onhold');
      const dropped = await parseRes(droppedRes, 'dropped');

      // Combine all items - use a Map to deduplicate by media_id + media_type
      const allItems = [...watching, ...watchlist, ...finished, ...onhold, ...dropped];

      // Sort by added_date descending (most recent first)
      allItems.sort((a, b) => {
        const dateA = a.added_date ? new Date(a.added_date).getTime() : 0;
        const dateB = b.added_date ? new Date(b.added_date).getTime() : 0;
        return dateB - dateA;
      });

      setItems(allItems);
    } catch (error) {
      console.error('Failed to fetch library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeFilterChange = (type: TypeFilter) => {
    setTypeFilter(type);
  };

  const handleStatusFilterChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setStatusDropdownOpen(false);
  };

  const openOptionsSheet = (item: LibraryItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  // Callbacks for status/tag changes
  const handleStatusChange = (newStatus: string) => {
    if (!selectedItem) return;
    // Update item's status in state
    setItems(prev => prev.map(item => {
      if (item.media_id === selectedItem.media_id && item.media_type === selectedItem.media_type) {
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  const handleRemove = () => {
    if (!selectedItem) return;
    setItems(prev => prev.filter(item =>
      !(item.media_id === selectedItem.media_id && item.media_type === selectedItem.media_type)
    ));
  };

  if (status === 'loading' || isLoading) {
    return <MediaListSkeleton layout={layout} />;
  }

  // Get display name for status filter
  const getStatusLabel = (status: StatusFilter) => {
    if (status === 'all') return 'All Statuses';
    return getListName(status) || statusLabels[status];
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ProfileMenu />
            <h1 className="text-2xl font-bold">Library</h1>
          </div>
          <NotificationBell />
        </div>

        {/* Type Filter Pills */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleTypeFilterChange('all')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              typeFilter === 'all' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleTypeFilterChange('movie')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              typeFilter === 'movie' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            onClick={() => handleTypeFilterChange('tv')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              typeFilter === 'tv' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Tv className="w-4 h-4" />
            TV Shows
          </button>
        </div>

        {/* Status Filter & Sort */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-sm transition"
            >
              <span>{getStatusLabel(statusFilter)}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {statusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStatusDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-zinc-800 rounded-lg shadow-lg overflow-hidden z-20 min-w-[140px]">
                  {(['all', 'watching', 'watchlist', 'finished', 'onhold', 'dropped'] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilterChange(status)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 transition ${
                        statusFilter === status ? 'text-brand-primary' : 'text-white'
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Layout Toggle */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setLayout('list')}
              className={`p-2 rounded-md transition ${
                layout === 'list' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`p-2 rounded-md transition ${
                layout === 'grid' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Item Count */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-400">{filteredItems.length} items</p>
      </div>

      <main className="px-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            iconType="finished"
            title={items.length === 0 ? "Your library is empty" : "No items match your filters"}
            subtitle={items.length === 0 ? "Add movies and shows to start tracking" : "Try adjusting the filters"}
            actionLabel={items.length === 0 ? "Search" : undefined}
            actionHref={items.length === 0 ? "/search" : undefined}
          />
        ) : layout === 'list' ? (
          /* List View */
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <div
                key={`${item.media_type}-${item.media_id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition group"
              >
                {/* Poster */}
                <Link
                  href={`/${item.media_type}/${item.media_id}`}
                  className="relative w-14 h-20 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800"
                >
                  <Image
                    src={getImageUrl(item.poster_path)}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                  {/* Media type badge */}
                  <div className="absolute bottom-1 left-1 w-5 h-5 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                    {item.media_type === 'movie' ? (
                      <Film className="w-3 h-3 text-white" />
                    ) : (
                      <Tv className="w-3 h-3 text-white" />
                    )}
                  </div>
                </Link>

                {/* Info */}
                <Link
                  href={`/${item.media_type}/${item.media_id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-400 capitalize">
                    {item.media_type === 'tv' ? 'TV Show' : 'Movie'} · {getListName(item.status || '') || statusLabels[item.status as StatusFilter] || item.status}
                  </p>
                </Link>

                {/* Favorite indicator */}
                {item.is_favorite && (
                  <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
                )}

                {/* Options Button */}
                <button
                  onClick={() => openOptionsSheet(item)}
                  className="p-2 text-gray-400 hover:text-white transition"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <div key={`${item.media_type}-${item.media_id}`} className="group relative">
                <Link href={`/${item.media_type}/${item.media_id}`}>
                  <div className="relative aspect-[2/3] mb-2 overflow-hidden rounded-lg bg-zinc-800">
                    <Image
                      src={getImageUrl(item.poster_path)}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:opacity-75 transition"
                      sizes="33vw"
                    />
                    {/* Media type badge */}
                    <div className="absolute top-2 left-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                      {item.media_type === 'movie' ? (
                        <Film className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Tv className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-xs line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                </Link>

                {item.is_favorite && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                  </div>
                )}

                {/* Options Button (visible on hover) */}
                <button
                  onClick={() => openOptionsSheet(item)}
                  className="absolute bottom-12 right-1 w-7 h-7 bg-black/75 hover:bg-zinc-700 backdrop-blur-sm rounded-full flex items-center justify-center transition z-10 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.media_id}
          mediaType={selectedItem.media_type as 'movie' | 'tv'}
          title={selectedItem.title}
          posterPath={selectedItem.poster_path}
          onStatusChange={handleStatusChange}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<MediaListSkeleton layout="grid" />}>
      <LibraryPageContent />
    </Suspense>
  );
}
