'use client';

import { useState, useEffect, use } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  GlobeLock,
  List,
  Star,
  Heart,
  Bookmark,
  Folder,
  Film,
  Tv,
  Trophy,
  Crown,
  Flame,
  Sparkles,
  Zap,
  Clock,
  Calendar,
  Eye,
  Play,
  Check,
  Flag,
  Loader2,
  Plus,
  Search,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import { showSuccess, showError } from '@/lib/toast';

interface ResolvedItem {
  id: number;
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  status: string | null;
  rating: number | null;
  watchedYear: number | null;
  isPinned: boolean;
}

interface List {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  listType: string;
  isPublic: boolean;
}

// Icon mapping
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  list: List,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  folder: Folder,
  film: Film,
  tv: Tv,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  sparkles: Sparkles,
  zap: Zap,
  clock: Clock,
  calendar: Calendar,
  eye: Eye,
  play: Play,
  check: Check,
  flag: Flag,
};

// Color classes
const COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ListPage({ params }: PageProps) {
  const { slug } = use(params);
  const { status } = useSession();
  const router = useRouter();

  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Media options sheet state
  const [selectedItem, setSelectedItem] = useState<ResolvedItem | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Select mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isRemoving, setIsRemoving] = useState(false);

  // Add items sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Portal mount state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchListData();
    }
  }, [status, router, slug]);

  const fetchListData = async () => {
    setIsLoading(true);
    try {
      // First get the list details
      const listsRes = await fetch('/api/lists');
      if (listsRes.ok) {
        const data = await listsRes.json();
        const foundList = data.lists.find((l: List) => l.slug === slug);
        if (foundList) {
          setList(foundList);

          // Then get the items
          const itemsRes = await fetch(`/api/lists/${foundList.id}/items`);
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            setItems(itemsData.items || []);
          }
        } else {
          // List not found
          router.push('/library');
        }
      }
    } catch (error) {
      console.error('Error fetching list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    if (!confirm(`Delete "${list.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showSuccess('List deleted');
        router.push('/library');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to delete list');
      }
    } catch (error) {
      showError('Failed to delete list');
    }
  };

  const handleTogglePublic = async () => {
    if (!list) return;

    try {
      const res = await fetch(`/api/lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !list.isPublic }),
      });

      if (res.ok) {
        setList({ ...list, isPublic: !list.isPublic });
        showSuccess(list.isPublic ? 'List is now private' : 'List is now public');
      } else {
        showError('Failed to update list');
      }
    } catch (error) {
      showError('Failed to update list');
    }
    setShowMenu(false);
  };

  const handleItemClick = (item: ResolvedItem) => {
    if (isSelectMode) {
      toggleSelect(item);
      return;
    }
    router.push(`/${item.mediaType}/${item.tmdbId}`);
  };

  const handleItemLongPress = (item: ResolvedItem) => {
    if (isSelectMode) {
      toggleSelect(item);
      return;
    }
    setSelectedItem(item);
    setIsOptionsOpen(true);
  };

  const toggleSelect = (item: ResolvedItem) => {
    const key = item.id || item.tmdbId;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedIds(newSelected);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleRemoveSelected = async () => {
    if (!list || selectedIds.size === 0) return;

    setIsRemoving(true);
    try {
      // Remove each selected item from the list
      const itemsToRemove = items.filter(item => selectedIds.has(item.id || item.tmdbId));

      await Promise.all(
        itemsToRemove.map(item =>
          fetch(`/api/lists/${list.id}/pins?tmdbId=${item.tmdbId}&mediaType=${item.mediaType}`, {
            method: 'DELETE',
          })
        )
      );

      showSuccess(`Removed ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}`);
      exitSelectMode();
      fetchListData();
    } catch (error) {
      showError('Failed to remove items');
    } finally {
      setIsRemoving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">List not found</p>
      </div>
    );
  }

  const IconComponent = ICON_COMPONENTS[list.icon] || List;
  const colorClass = COLOR_CLASSES[list.color] || 'bg-gray-500';

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur px-4 py-3">
        {isSelectMode ? (
          /* Select Mode Header */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={exitSelectMode}
                className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
              >
                <X className="w-6 h-6" />
              </button>
              <span className="text-lg font-medium">
                {selectedIds.size} selected
              </span>
            </div>
            <button
              onClick={handleRemoveSelected}
              disabled={selectedIds.size === 0 || isRemoving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-medium transition"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Remove
            </button>
          </div>
        ) : (
          /* Normal Header */
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
                  <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{list.name}</h1>
                  <p className="text-sm text-gray-400">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                    {list.isPublic && ' • Public'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddSheet(true)}
                  className="p-2 hover:bg-zinc-800 rounded-full transition"
                  title="Add items"
                >
                  <Plus className="w-5 h-5" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-zinc-800 rounded-lg shadow-lg overflow-hidden min-w-[180px] z-20">
                        {items.length > 0 && (
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              setIsSelectMode(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition"
                          >
                            <CheckSquare className="w-5 h-5" />
                            <span>Select Items</span>
                          </button>
                        )}
                        <button
                          onClick={handleTogglePublic}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition"
                        >
                          {list.isPublic ? (
                            <GlobeLock className="w-5 h-5" />
                          ) : (
                            <Globe className="w-5 h-5" />
                          )}
                          <span>{list.isPublic ? 'Make Private' : 'Make Public'}</span>
                        </button>
                        <button
                          onClick={handleDeleteList}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-700 transition text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                          <span>Delete List</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {list.description && (
              <p className="text-sm text-gray-400 mt-2 px-2">{list.description}</p>
            )}
          </>
        )}
      </header>

      {/* Items Grid */}
      <main className="px-4 pt-4">
        {items.length === 0 ? (
          <div className="py-8">
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-6">
              <p className="text-center text-gray-400 mb-4">Add items to your list</p>
              <div className="flex gap-3">
                <Link
                  href={`/search?addToList=${list.id}`}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition group"
                >
                  <Search className="w-6 h-6" />
                  <span className="text-sm font-medium">Search</span>
                </Link>
                <Link
                  href={`/library/manage?addToList=${list.id}`}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition group"
                >
                  <Film className="w-6 h-6" />
                  <span className="text-sm font-medium">From Library</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {items.map((item) => {
              const itemKey = item.id || item.tmdbId;
              const isSelected = selectedIds.has(itemKey);

              return (
                <div
                  key={item.id || `${item.mediaType}-${item.tmdbId}`}
                  className={`relative group cursor-pointer transition ${
                    isSelectMode && isSelected ? 'ring-2 ring-brand-primary rounded-lg' : ''
                  }`}
                  onClick={() => handleItemClick(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleItemLongPress(item);
                  }}
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                    {item.posterPath ? (
                      <Image
                        src={getImageUrl(item.posterPath)}
                        alt={item.title}
                        fill
                        className={`object-cover ${isSelectMode && isSelected ? 'opacity-80' : ''}`}
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}

                    {/* Select Mode Checkbox */}
                    {isSelectMode && (
                      <div className="absolute top-2 left-2 z-[1]">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-primary bg-black rounded" />
                        ) : (
                          <Square className="w-5 h-5 text-white/60 bg-black/50 rounded" />
                        )}
                      </div>
                    )}

                    {/* Rating Badge */}
                    {!isSelectMode && item.rating && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-xs font-medium flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        {item.rating}
                      </div>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium truncate">{item.title}</p>
                  {item.releaseYear && (
                    <p className="text-xs text-gray-400">{item.releaseYear}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Media Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isOptionsOpen}
          onClose={() => {
            setIsOptionsOpen(false);
            setSelectedItem(null);
          }}
          mediaId={selectedItem.tmdbId}
          mediaType={selectedItem.mediaType}
          title={selectedItem.title}
          posterPath={selectedItem.posterPath || ''}
          currentStatus={selectedItem.status}
          onStatusChange={() => fetchListData()}
          onRemove={() => fetchListData()}
        />
      )}

      {/* Add Items Sheet - rendered via portal */}
      {mounted && showAddSheet && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80" onClick={() => setShowAddSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>

            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Add Items</h2>
                <button
                  onClick={() => setShowAddSheet(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/search?addToList=${list.id}`}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition"
                  onClick={() => setShowAddSheet(false)}
                >
                  <Search className="w-6 h-6" />
                  <span className="text-sm font-medium">Search</span>
                  <span className="text-xs text-gray-500">Find new movies & shows</span>
                </Link>
                <Link
                  href={`/library/manage?addToList=${list.id}`}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white transition"
                  onClick={() => setShowAddSheet(false)}
                >
                  <Film className="w-6 h-6" />
                  <span className="text-sm font-medium">From Library</span>
                  <span className="text-xs text-gray-500">Add from your collection</span>
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
