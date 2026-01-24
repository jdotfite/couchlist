'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Film,
  Tv,
  Plus,
  Check,
  Star,
} from 'lucide-react';
// MediaCard not needed - using inline rendering for friend's items

interface FriendInfo {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
}

interface MediaItem {
  id: number;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  release_year?: number;
  rating?: number;
  status?: string;
}

interface PageParams {
  friendId: string;
  listType: string;
}

export default function FriendListViewPage({ params }: { params: Promise<PageParams> }) {
  const { friendId, listType } = use(params);
  const searchParams = useSearchParams();
  const listId = searchParams.get('listId');

  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [listName, setListName] = useState(listType);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which items user has in their library
  const [userLibrary, setUserLibrary] = useState<Set<string>>(new Set());
  const [addingItem, setAddingItem] = useState<number | null>(null);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchListData();
      fetchUserLibrary();
    }
  }, [authStatus, friendId, listType, listId]);

  const fetchListData = async () => {
    try {
      // Fetch friend's list items
      const url = `/api/friends/${friendId}/lists/${listType}${listId ? `?listId=${listId}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 403) {
          setError('You don\'t have access to this list');
        } else if (response.status === 404) {
          setError('List not found');
        } else {
          setError('Failed to load list');
        }
        return;
      }

      const data = await response.json();
      setFriend(data.friend);
      setListName(data.listName || listType);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch list:', err);
      setError('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLibrary = async () => {
    try {
      const response = await fetch('/api/library');
      if (response.ok) {
        const data = await response.json();
        const mediaIds = new Set<string>();
        (data.media || []).forEach((item: MediaItem) => {
          mediaIds.add(`${item.media_type}-${item.tmdb_id}`);
        });
        setUserLibrary(mediaIds);
      }
    } catch (err) {
      console.error('Failed to fetch library:', err);
    }
  };

  const handleAddToLibrary = async (item: MediaItem) => {
    setAddingItem(item.tmdb_id);

    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.tmdb_id,
          mediaType: item.media_type,
          title: item.title,
          posterPath: item.poster_path,
          status: 'watchlist',
        }),
      });

      if (response.ok) {
        setUserLibrary((prev) => new Set([...prev, `${item.media_type}-${item.tmdb_id}`]));
      }
    } catch (err) {
      console.error('Failed to add to library:', err);
    } finally {
      setAddingItem(null);
    }
  };

  // Loading state
  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not logged in
  if (authStatus === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <h1 className="text-xl font-bold mb-2">Can't view list</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/friends"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 rounded-full font-semibold hover:bg-zinc-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Friends
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center gap-4 p-4">
          <Link
            href="/friends"
            className="p-2 -ml-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {friend && (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {friend.image ? (
                  <img
                    src={friend.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {friend.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-white truncate">{listName}</h1>
              <p className="text-sm text-gray-400 truncate">
                {friend?.name}'s list • {items.length} items
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-white mb-2">List is empty</h2>
            <p className="text-gray-400">
              {friend?.name} hasn't added anything to this list yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {items.map((item) => {
              const isInLibrary = userLibrary.has(`${item.media_type}-${item.tmdb_id}`);
              const isAdding = addingItem === item.tmdb_id;

              return (
                <div key={`${item.media_type}-${item.tmdb_id}`} className="relative group">
                  <Link href={`/${item.media_type}/${item.tmdb_id}`}>
                    <div className="aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden">
                      {item.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {item.media_type === 'movie' ? (
                            <Film className="w-8 h-8 text-gray-600" />
                          ) : (
                            <Tv className="w-8 h-8 text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Add to library button overlay */}
                  {!isInLibrary && (
                    <button
                      onClick={() => handleAddToLibrary(item)}
                      disabled={isAdding}
                      className="absolute bottom-2 right-2 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-brand-primary transition opacity-0 group-hover:opacity-100"
                    >
                      {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  {/* In library indicator */}
                  {isInLibrary && (
                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Media type badge */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                    {item.media_type === 'movie' ? 'Movie' : 'TV'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
