'use client';

import { useState, useEffect, use } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  XCircle,
  Check,
  Users,
  Trash2,
  Film,
  Tv,
  Pencil,
  X,
} from 'lucide-react';

interface CollaborativeList {
  id: number;
  name: string;
  itemCount: number;
  members: Array<{
    userId: number;
    name: string;
    image: string | null;
  }>;
}

interface CollaborativeListItem {
  id: number;
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  addedByUserId: number;
  addedByName: string;
  addedByImage: string | null;
  createdAt: string;
}

interface PageProps {
  params: Promise<{ friendId: string }>;
}

export default function CollaborativeListPage({ params }: PageProps) {
  const { friendId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const friendUserId = parseInt(friendId);

  // State
  const [list, setList] = useState<CollaborativeList | null>(null);
  const [items, setItems] = useState<CollaborativeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Mark as watched modal
  const [watchedItem, setWatchedItem] = useState<CollaborativeListItem | null>(null);
  const [markingWatched, setMarkingWatched] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Portal mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, friendUserId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/friends/${friendUserId}/collaborative-list`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load list');
        return;
      }

      if (!data.list) {
        // No collaborative list exists - redirect back
        router.push('/profile');
        return;
      }

      setList(data.list);
      setItems(data.items || []);
      setNewName(data.list.name);
    } catch (err) {
      setError('Failed to load collaborative list');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || !list) return;

    setRenaming(true);
    try {
      const response = await fetch(`/api/friends/${friendUserId}/collaborative-list`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        setList({ ...list, name: newName.trim() });
        setShowRenameModal(false);
      }
    } catch (err) {
      console.error('Failed to rename list:', err);
    } finally {
      setRenaming(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/friends/${friendUserId}/collaborative-list/items/${itemId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== itemId));
        if (list) {
          setList({ ...list, itemCount: list.itemCount - 1 });
        }
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleMarkWatched = async (moveToFinished: boolean) => {
    if (!watchedItem) return;

    setMarkingWatched(true);
    try {
      const response = await fetch(
        `/api/friends/${friendUserId}/collaborative-list/items/${watchedItem.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moveToFinished }),
        }
      );

      if (response.ok) {
        setItems(prev => prev.filter(i => i.id !== watchedItem.id));
        if (list) {
          setList({ ...list, itemCount: list.itemCount - 1 });
        }
        setWatchedItem(null);
      }
    } catch (err) {
      console.error('Failed to mark as watched:', err);
    } finally {
      setMarkingWatched(false);
    }
  };

  // Get friend's info from the list members
  const friend = list?.members.find(m => m.userId === friendUserId);
  const currentUser = list?.members.find(m => m.userId !== friendUserId);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
        <Link
          href="/profile"
          className="mt-4 inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Profile
        </Link>
      </div>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold truncate">{list.name}</h1>
              <button
                onClick={() => setShowRenameModal(true)}
                className="p-1 hover:bg-zinc-800 rounded transition"
              >
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              with {friend?.name} · {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
          {/* Both avatars */}
          <div className="flex -space-x-2">
            {list.members.map(member => (
              <div
                key={member.userId}
                className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden border-2 border-black"
              >
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs font-semibold">
                    {member.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-3"
              >
                {/* Poster */}
                <Link
                  href={`/${item.mediaType}/${item.tmdbId}`}
                  className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800"
                >
                  {item.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.mediaType === 'movie' ? (
                        <Film className="w-6 h-6 text-gray-600" />
                      ) : (
                        <Tv className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                  )}
                  {/* Media type badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-medium">
                    {item.mediaType === 'movie' ? 'Movie' : 'TV'}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/${item.mediaType}/${item.tmdbId}`}>
                    <h3 className="font-semibold text-sm truncate hover:text-green-400 transition">
                      {item.title}
                    </h3>
                  </Link>
                  {item.releaseYear && (
                    <p className="text-xs text-gray-500">{item.releaseYear}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Added by {item.addedByName}
                  </p>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setWatchedItem(item)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3" />
                      Watched
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition flex items-center gap-1.5 text-gray-300"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-900 rounded-xl">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your shared list is empty</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Add movies and TV shows from their detail pages to watch together with {friend?.name}.
            </p>
          </div>
        )}
      </main>

      {/* Rename Modal */}
      {showRenameModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRenameModal(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Rename List</h2>
              <button
                onClick={() => setShowRenameModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="List name"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 mb-4"
              maxLength={50}
            />

            <button
              onClick={handleRename}
              disabled={renaming || !newName.trim()}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              {renaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Mark as Watched Modal */}
      {watchedItem && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !markingWatched && setWatchedItem(null)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Mark as Watched</h2>
              <p className="text-gray-400 text-sm">
                What would you like to do with "{watchedItem.title}"?
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleMarkWatched(true)}
                disabled={markingWatched}
                className="w-full p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl transition text-left disabled:opacity-50"
              >
                <div className="font-semibold text-white flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Move to Watched
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Adds to both your Finished lists with "Watched with {friend?.name}" note
                </p>
              </button>

              <button
                onClick={() => handleMarkWatched(false)}
                disabled={markingWatched}
                className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition text-left disabled:opacity-50"
              >
                <div className="font-semibold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-gray-400" />
                  Just Remove
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Remove from list without tracking
                </p>
              </button>
            </div>

            {markingWatched && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}

            <button
              onClick={() => setWatchedItem(null)}
              disabled={markingWatched}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteConfirm(null)}
          />

          <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Remove Item?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This will remove the item from your shared list. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveItem(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
