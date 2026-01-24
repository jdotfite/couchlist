'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ChevronRight,
  Loader2,
  Eye,
  Clock,
  Play,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Heart,
  RotateCcw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

interface FriendWithLists {
  friendId: number;
  friendName: string;
  friendUsername: string | null;
  friendImage: string | null;
  sharedListCount: number;
}

interface SharedList {
  listType: string;
  listId: number | null;
  listName: string;
  visibility: string;
  itemCount: number;
}

interface FriendData {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
}

const listIcons: Record<string, React.ReactNode> = {
  watchlist: <Clock className="w-5 h-5 text-blue-500" />,
  watching: <Play className="w-5 h-5 text-green-500" />,
  finished: <CheckCircle2 className="w-5 h-5 text-brand-primary" />,
  onhold: <PauseCircle className="w-5 h-5 text-yellow-500" />,
  dropped: <XCircle className="w-5 h-5 text-red-500" />,
  favorites: <Heart className="w-5 h-5 text-pink-500" />,
  rewatch: <RotateCcw className="w-5 h-5 text-cyan-500" />,
  nostalgia: <Sparkles className="w-5 h-5 text-amber-500" />,
};

export default function FriendsListsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendWithLists[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [friendLists, setFriendLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchFriendsWhoShare();
    }
  }, [authStatus]);

  const fetchFriendsWhoShare = async () => {
    try {
      const response = await fetch('/api/friends/sharing');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = async (friend: FriendWithLists) => {
    setSelectedFriend({
      id: friend.friendId,
      name: friend.friendName,
      username: friend.friendUsername,
      image: friend.friendImage,
    });
    setLoadingLists(true);

    try {
      const response = await fetch(`/api/friends/${friend.friendId}/lists`);
      if (response.ok) {
        const data = await response.json();
        setFriendLists(data.lists || []);
      }
    } catch (err) {
      console.error('Failed to fetch friend lists:', err);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setFriendLists([]);
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

  // Show selected friend's lists
  if (selectedFriend) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800">
          <div className="flex items-center gap-4 p-4">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                {selectedFriend.image ? (
                  <img
                    src={selectedFriend.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {selectedFriend.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-bold text-white">{selectedFriend.name}'s Lists</h1>
                {selectedFriend.username && (
                  <p className="text-sm text-gray-400">@{selectedFriend.username}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loadingLists ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : friendLists.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-lg font-semibold text-white mb-2">No lists shared</h2>
              <p className="text-gray-400">
                {selectedFriend.name} hasn't shared any lists with you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendLists.map((list) => {
                const icon = listIcons[list.listType] || <Eye className="w-5 h-5 text-gray-400" />;
                return (
                  <Link
                    key={`${list.listType}-${list.listId || 'system'}`}
                    href={`/friends/${selectedFriend.id}/${list.listType}${list.listId ? `?listId=${list.listId}` : ''}`}
                    className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition"
                  >
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{list.listName}</h3>
                      <p className="text-sm text-gray-400">
                        {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show friends list
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center gap-4 p-4">
          <Link
            href="/profile"
            className="p-2 -ml-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Friends' Lists</h1>
            <p className="text-sm text-gray-400">Browse lists shared with you</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {friends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-white mb-2">No shared lists yet</h2>
            <p className="text-gray-400 mb-6">
              When friends share their lists with you, they'll appear here.
            </p>
            <Link
              href="/settings/sharing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary rounded-full font-semibold hover:bg-brand-primary-dark transition"
            >
              <Users className="w-5 h-5" />
              Add Friends
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <button
                key={friend.friendId}
                onClick={() => handleSelectFriend(friend)}
                className="w-full flex items-center gap-4 p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition text-left"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                  {friend.friendImage ? (
                    <img
                      src={friend.friendImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {friend.friendName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{friend.friendName}</h3>
                  {friend.friendUsername && (
                    <p className="text-sm text-gray-500">@{friend.friendUsername}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {friend.sharedListCount} {friend.sharedListCount === 1 ? 'list' : 'lists'} shared
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
