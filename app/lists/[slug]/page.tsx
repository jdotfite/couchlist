'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  Grid3X3,
  List,
  Loader2,
  MoreVertical,
  Users,
  Settings,
  Trash2,
} from 'lucide-react';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';
import EditListModal from '@/components/custom-lists/EditListModal';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import SortFilterBar, { SortOption, sortItems, filterItems } from '@/components/SortFilterBar';
import { getImageUrl } from '@/lib/tmdb';

interface CustomList {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_shared: boolean;
  item_count?: number;
}

interface ListItem {
  id: number;
  media_id: number;
  title: string;
  poster_path: string;
  media_type: string;
  tmdb_id: number;
  added_by_name?: string;
  added_at: string;
  added_date?: string; // Alias for sorting compatibility
  rating?: number;
}

type LayoutType = 'list' | 'grid';

export default function CustomListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [list, setList] = useState<CustomList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutType>('list');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('added-desc');

  // Apply search and sort to items
  const filteredItems = useMemo(() => {
    // Map added_at to added_date for sorting compatibility
    const itemsWithDate = items.map(item => ({
      ...item,
      added_date: item.added_at || item.added_date,
    }));
    const searched = filterItems(itemsWithDate, searchQuery);
    return sortItems(searched, sortBy);
  }, [items, searchQuery, sortBy]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchList();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, slug]);

  const fetchList = async () => {
    try {
      const response = await fetch(`/api/custom-lists/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/lists');
        }
        return;
      }

      const data = await response.json();
      setList(data.list);
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (mediaId: number) => {
    setRemovingId(mediaId);
    try {
      const response = await fetch(`/api/custom-lists/${slug}/items?mediaId=${mediaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter(item => item.media_id !== mediaId));
        if (list) {
          setList({ ...list, item_count: (list.item_count || 1) - 1 });
        }
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleListUpdated = (updatedList: CustomList) => {
    setList(updatedList);
  };

  const handleListDeleted = () => {
    router.push('/lists');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pb-24">
        <div className="text-center">
          <h2 className="text-2xl mb-2">List not found</h2>
          <Link href="/lists" className="text-brand-primary hover:underline">
            Back to Lists
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = getIconComponent(list.icon);
  const colorValue = getColorValue(list.color);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${colorValue}20` }}
          >
            <IconComponent className="w-5 h-5" style={{ color: colorValue }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{list.name}</h1>
              {list.is_shared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-xs font-medium rounded-full">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{items.length} items</p>
          </div>
          <div className="flex items-center gap-1">
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
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Description */}
      {list.description && (
        <div className="px-4 py-2">
          <p className="text-sm text-gray-400">{list.description}</p>
        </div>
      )}

      <main className="px-4 pt-4">
        {/* Sort and Filter Bar */}
        {items.length > 0 && (
          <SortFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={searchQuery ? filteredItems.length : undefined}
            placeholder="Search this list..."
          />
        )}

        {filteredItems.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No results found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-brand-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">This list is empty</p>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-light rounded-lg transition"
            >
              Discover content to add
            </Link>
          </div>
        ) : layout === 'list' ? (
          <div className="space-y-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
              >
                <Link
                  href={`/${item.media_type}/${item.tmdb_id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden bg-zinc-800">
                    <Image
                      src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-xs text-gray-400 capitalize">
                      {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                      {item.added_by_name && ` • Added by ${item.added_by_name}`}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsSheetOpen(true);
                    }}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition text-gray-400"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleRemoveItem(item.media_id)}
                    disabled={removingId === item.media_id}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition text-gray-400 hover:text-red-400 disabled:opacity-50"
                  >
                    {removingId === item.media_id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/${item.media_type}/${item.tmdb_id}`}
                className="group"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                  <Image
                    src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:opacity-75 transition"
                    sizes="33vw"
                  />
                </div>
                <h3 className="mt-2 text-sm font-medium line-clamp-2">{item.title}</h3>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Edit List Modal */}
      <EditListModal
        isOpen={isEditOpen}
        list={list}
        onClose={() => setIsEditOpen(false)}
        onUpdated={handleListUpdated}
        onDeleted={handleListDeleted}
      />

      {/* Media Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.tmdb_id}
          mediaType={selectedItem.media_type as 'movie' | 'tv'}
          title={selectedItem.title}
          posterPath={selectedItem.poster_path}
        />
      )}
    </div>
  );
}
