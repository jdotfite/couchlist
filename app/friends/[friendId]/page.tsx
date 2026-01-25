'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  ChevronRight,
  Users,
} from 'lucide-react';
import { SYSTEM_LISTS, SYSTEM_LIST_MAP } from '@/lib/list-config';

interface FriendInfo {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
}

interface SharedList {
  listType: string;
  listId: number | null;
  listName: string;
  visibility: string;
  itemCount: number;
  canEdit: boolean;
}

interface CollaborativeList {
  id: number;
  name: string;
  itemCount: number;
}

export default function FriendProfilePage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);
  const [collaborativeList, setCollaborativeList] = useState<CollaborativeList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchFriendData();
    }
  }, [authStatus, friendId]);

  const fetchFriendData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch friend info and their shared lists
      const response = await fetch(`/api/friends/${friendId}/lists`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Friend not found');
        } else if (response.status === 403) {
          setError('You are not friends with this user');
        } else {
          setError('Failed to load friend data');
        }
        return;
      }

      const data = await response.json();
      setFriend(data.friend);
      setSharedLists(data.lists || []);

      // Fetch collaborative list if exists
      const collabResponse = await fetch(`/api/friends/${friendId}/collaborative-list`);
      if (collabResponse.ok) {
        const collabData = await collabResponse.json();
        setCollaborativeList(collabData.list);
      }
    } catch (err) {
      console.error('Error fetching friend data:', err);
      setError('Failed to load friend data');
    } finally {
      setLoading(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-center py-12">
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
              {friend?.image ? (
                <img
                  src={friend.image}
                  alt={friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {friend?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-semibold">{friend?.name}</h1>
              {friend?.username && (
                <p className="text-sm text-gray-500">@{friend.username}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Lists they share with you */}
        {sharedLists.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Lists shared with you</h2>
            <div className="space-y-2">
              {sharedLists.map((list) => {
                const config = SYSTEM_LIST_MAP[list.listType];
                const IconComponent = config?.icon;

                return (
                  <Link
                    key={`${list.listType}-${list.listId || 'system'}`}
                    href={`/friends/${friendId}/${list.listType}${list.listId ? `?listId=${list.listId}` : ''}`}
                    className="flex items-center gap-3 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
                  >
                    {config && IconComponent && (
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.bgColorClass} flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{list.listName}</p>
                      <p className="text-sm text-gray-500">
                        {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Collaborative list */}
        {collaborativeList && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Shared list</h2>
            <Link
              href={`/friends/${friendId}/list`}
              className="flex items-center gap-3 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{collaborativeList.name}</p>
                <p className="text-sm text-gray-500">
                  {collaborativeList.itemCount} {collaborativeList.itemCount === 1 ? 'item' : 'items'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </section>
        )}

        {/* Empty state */}
        {sharedLists.length === 0 && !collaborativeList && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-2">No shared lists yet</p>
            <p className="text-sm text-gray-500">
              {friend?.name} hasn't shared any lists with you yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
