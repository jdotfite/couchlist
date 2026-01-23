'use client';

import { useState, useEffect, use } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import ProfileMenu from '@/components/ProfileMenu';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';
import { getImageUrl } from '@/lib/tmdb';
import { CheckSquare, Square, Film, Tv, Baby, Star } from 'lucide-react';

interface ListItem {
  user_media_id: number;
  media_id: number;
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  genre_ids: string | null;
  release_year: number | null;
  rating: number | null;
}

interface ListInfo {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

const KIDS_GENRES = [10762, 10751, 16];

export default function ManageCustomListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [list, setList] = useState<ListInfo | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchItems();
    }
  }, [authStatus, router, slug]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/custom-lists/${slug}/bulk`);
      if (res.ok) {
        const data = await res.json();
        setList(data.list);
        setItems(data.items || []);
      } else if (res.status === 404) {
        router.push('/lists');
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/custom-lists/${slug}/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.media_id)));
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (mediaId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId);
    } else {
      newSelected.add(mediaId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.media_id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const isKidsContent = (item: ListItem): boolean => {
    const genres = item.genre_ids ? item.genre_ids.split(',').map(Number) : [];
    return genres.some((g) => KIDS_GENRES.includes(g));
  };

  // Filter items by search
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <header className="sticky top-0 z-20 bg-black px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link href={`/lists/${slug}`} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Manage List</h1>
          </div>
        </header>
        <main className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/lists/${slug}`} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Manage {list?.name || 'List'}</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      {/* Search Bar */}
      <div className="sticky top-[57px] z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search titles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {/* Selection Controls */}
      <div className="px-4 py-3 flex items-center justify-between text-sm border-b border-zinc-800">
        <span className="text-gray-400">
          {filteredItems.length} items
          {selectedIds.size > 0 && <span className="text-white"> · {selectedIds.size} selected</span>}
        </span>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 ? (
            <button onClick={deselectAll} className="text-gray-400 hover:text-white">
              Deselect all
            </button>
          ) : (
            <button onClick={selectAll} className="text-gray-400 hover:text-white">
              Select all
            </button>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="px-4 py-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.media_id);
              const isKids = isKidsContent(item);

              return (
                <div
                  key={item.user_media_id}
                  onClick={() => toggleSelect(item.media_id)}
                  className={`relative cursor-pointer transition ${
                    isSelected ? 'ring-2 ring-brand-primary rounded-lg' : ''
                  }`}
                >
                  {/* Poster */}
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-[1]">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-brand-primary bg-black rounded" />
                      ) : (
                        <Square className="w-5 h-5 text-white/60 bg-black/50 rounded" />
                      )}
                    </div>

                    {/* Kids Badge */}
                    {isKids && (
                      <div className="absolute top-2 right-2 z-[1] bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                        <Baby className="w-3 h-3" />
                      </div>
                    )}

                    <Image
                      src={getImageUrl(item.poster_path)}
                      alt={item.title}
                      fill
                      className={`object-cover ${isSelected ? 'opacity-80' : ''}`}
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                    />
                  </div>

                  {/* Title */}
                  <p className="mt-1 text-xs truncate">{item.title}</p>

                  {/* Meta Row */}
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                    {item.media_type === 'movie' ? (
                      <Film className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <Tv className="w-3 h-3 flex-shrink-0" />
                    )}
                    {item.release_year && <span>{item.release_year}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Action Bar - rendered via portal to escape transformed container */}
      {portalMounted && selectedIds.size > 0 && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[100]">
          <div className="bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-20 px-4">
            <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm text-white">{selectedIds.size} selected</span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition text-white"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove from List
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal - rendered via portal */}
      {portalMounted && showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 text-white">Remove {selectedIds.size} items?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will remove these items from &quot;{list?.name}&quot;. The items will still be in your main library.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
