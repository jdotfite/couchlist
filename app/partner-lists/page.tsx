'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  Plus,
  ChevronLeft,
  Loader2,
  AlertCircle,
  XCircle,
  Check,
  Users,
  User,
  Trash2,
  MoreVertical,
  Film,
  Tv,
  ChevronRight,
} from 'lucide-react';

interface Partner {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
}

interface PartnerList {
  id: number;
  name: string;
  description: string | null;
  itemCount: number;
  createdAt: string;
}

interface PartnerListItem {
  id: number;
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  addedBy: {
    id: number;
    name: string;
  };
  addedAt: string;
  myStatus: {
    watched: boolean;
    watchedAt: string | null;
    watchedTogether: boolean;
  } | null;
  partnerStatus: {
    watched: boolean;
    watchedAt: string | null;
    watchedTogether: boolean;
  } | null;
}

export default function PartnerListsPage() {
  const { status } = useSession();
  const router = useRouter();

  // State
  const [partner, setPartner] = useState<Partner | null>(null);
  const [lists, setLists] = useState<PartnerList[]>([]);
  const [selectedList, setSelectedList] = useState<PartnerList | null>(null);
  const [listItems, setListItems] = useState<PartnerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create list modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Watched together modal
  const [watchedTogetherItem, setWatchedTogetherItem] = useState<PartnerListItem | null>(null);
  const [markingWatched, setMarkingWatched] = useState(false);

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
  }, [status]);

  useEffect(() => {
    if (selectedList) {
      fetchListItems(selectedList.id);
    }
  }, [selectedList]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch partner and lists
      const [partnerRes, listsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/partner-lists'),
      ]);

      const partnerData = await partnerRes.json();
      const listsData = await listsRes.json();

      if (partnerRes.ok && partnerData.partner) {
        setPartner(partnerData.partner);
      } else {
        // No partner - redirect to sharing settings
        router.push('/settings/sharing');
        return;
      }

      if (listsRes.ok) {
        setLists(listsData.lists || []);
        // Auto-select first list if exists
        if (listsData.lists?.length > 0) {
          setSelectedList(listsData.lists[0]);
        }
      }
    } catch (err) {
      setError('Failed to load partner lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (listId: number) => {
    try {
      setItemsLoading(true);
      const response = await fetch(`/api/partner-lists/${listId}/items`);
      const data = await response.json();

      if (response.ok) {
        setListItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch list items:', err);
    } finally {
      setItemsLoading(false);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;

    setCreateLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/partner-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create list');
        return;
      }

      const newList = {
        id: data.list.id,
        name: data.list.name,
        description: data.list.description,
        itemCount: 0,
        createdAt: new Date().toISOString(),
      };

      setLists(prev => [...prev, newList]);
      setSelectedList(newList);
      setShowCreateModal(false);
      setNewListName('');
      setNewListDescription('');
    } catch (err) {
      setError('Failed to create list');
    } finally {
      setCreateLoading(false);
    }
  };

  const deleteList = async (listId: number) => {
    try {
      const response = await fetch(`/api/partner-lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLists(prev => prev.filter(l => l.id !== listId));
        if (selectedList?.id === listId) {
          setSelectedList(lists.find(l => l.id !== listId) || null);
          setListItems([]);
        }
      }
    } catch (err) {
      setError('Failed to delete list');
    }
  };

  const markWatchedTogether = async (item: PartnerListItem) => {
    if (!selectedList) return;

    setMarkingWatched(true);
    setError(null);

    try {
      const response = await fetch(`/api/partner-lists/${selectedList.id}/items/${item.id}/watched-together`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to mark as watched together');
        return;
      }

      // Update local state
      setListItems(prev => prev.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            myStatus: {
              watched: true,
              watchedAt: new Date().toISOString(),
              watchedTogether: true,
            },
          };
        }
        return i;
      }));

      setWatchedTogetherItem(null);
    } catch (err) {
      setError('Failed to mark as watched together');
    } finally {
      setMarkingWatched(false);
    }
  };

  const markWatchedSolo = async (item: PartnerListItem) => {
    if (!selectedList) return;

    try {
      const response = await fetch(`/api/partner-lists/${selectedList.id}/items/${item.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched: true, watchedTogether: false }),
      });

      if (response.ok) {
        setListItems(prev => prev.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              myStatus: {
                watched: true,
                watchedAt: new Date().toISOString(),
                watchedTogether: false,
              },
            };
          }
          return i;
        }));
      }
    } catch (err) {
      console.error('Failed to mark as watched:', err);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!selectedList) return;

    try {
      const response = await fetch(`/api/partner-lists/${selectedList.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setListItems(prev => prev.filter(i => i.id !== itemId));
        setLists(prev => prev.map(l => {
          if (l.id === selectedList.id) {
            return { ...l, itemCount: l.itemCount - 1 };
          }
          return l;
        }));
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!partner) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/settings/sharing" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Partner Lists
            </h1>
            <p className="text-xs text-gray-400">with {partner.name}</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Lists horizontal scroll */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {lists.map(list => (
              <button
                key={list.id}
                onClick={() => setSelectedList(list)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedList?.id === list.id
                    ? 'bg-pink-500 text-white'
                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                }`}
              >
                {list.name}
                <span className="ml-1.5 text-xs opacity-70">({list.itemCount})</span>
              </button>
            ))}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-zinc-800 text-gray-300 hover:bg-zinc-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New List
            </button>
          </div>
        </div>

        {/* List content */}
        {selectedList ? (
          <div>
            {/* List header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedList.name}</h2>
                {selectedList.description && (
                  <p className="text-sm text-gray-400">{selectedList.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteList(selectedList.id)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            {itemsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : listItems.length > 0 ? (
              <div className="space-y-3">
                {listItems.map(item => (
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
                        <h3 className="font-semibold text-sm truncate hover:text-pink-400 transition">
                          {item.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Added by {item.addedBy.name}
                      </p>

                      {/* Watch status */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {item.myStatus?.watchedTogether ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">
                            <Users className="w-3 h-3" />
                            Watched together
                          </span>
                        ) : item.myStatus?.watched ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 text-gray-300 rounded text-xs">
                            <User className="w-3 h-3" />
                            You watched
                          </span>
                        ) : null}

                        {item.partnerStatus?.watched && !item.myStatus?.watchedTogether && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 text-gray-300 rounded text-xs">
                            <User className="w-3 h-3" />
                            {partner.name} watched
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {!item.myStatus?.watchedTogether && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setWatchedTogetherItem(item)}
                            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <Users className="w-3 h-3" />
                            Watched Together
                          </button>
                          {!item.myStatus?.watched && (
                            <button
                              onClick={() => markWatchedSolo(item)}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition"
                            >
                              Just Me
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-500 hover:text-red-400 self-start"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-900 rounded-xl">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Film className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No items yet</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Add movies and TV shows to this list from their detail pages.
                </p>
              </div>
            )}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Create your first partner list</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6">
              Partner lists let you and {partner.name} track shows and movies together.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-pink-500 hover:bg-pink-600 rounded-full font-semibold transition inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create List
            </button>
          </div>
        ) : null}
      </main>

      {/* Create List Modal */}
      {showCreateModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCreateModal(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Create Partner List</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">List Name</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Date Night Movies"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="What's this list for?"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  maxLength={100}
                />
              </div>
            </div>

            <button
              onClick={createList}
              disabled={createLoading || !newListName.trim()}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              {createLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create List
                </>
              )}
            </button>

            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Watched Together Modal */}
      {watchedTogetherItem && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setWatchedTogetherItem(null)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-pink-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Watched Together?</h2>
              <p className="text-gray-400 text-sm">
                Mark "{watchedTogetherItem.title}" as watched together with {partner?.name}?
              </p>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-300">
                Both you and {partner?.name} will be marked as having watched this together.
              </p>
            </div>

            <button
              onClick={() => markWatchedTogether(watchedTogetherItem)}
              disabled={markingWatched}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              {markingWatched ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Yes, Watched Together
                </>
              )}
            </button>

            <button
              onClick={() => setWatchedTogetherItem(null)}
              className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
