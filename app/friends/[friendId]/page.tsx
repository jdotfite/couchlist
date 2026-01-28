'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Users,
  MessageCircle,
} from 'lucide-react';

interface FriendInfo {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: string;
}

interface SuggestionStats {
  sent: number;
  received: number;
  pending: number;
}

export default function FriendProfilePage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [suggestionStats, setSuggestionStats] = useState<SuggestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchFriendData();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, friendId]);

  const fetchFriendData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/friends/${friendId}`);

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
      setSuggestionStats(data.suggestionStats || null);
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
        {/* Friend Info Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
              {friend?.image ? (
                <img
                  src={friend.image}
                  alt={friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-semibold">
                  {friend?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{friend?.name}</h2>
              {friend?.username && (
                <p className="text-gray-500">@{friend.username}</p>
              )}
              {friend?.connectedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Friends since {new Date(friend.connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Suggestion Stats */}
          {suggestionStats && (
            <div className="flex items-center gap-6 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">
                  {suggestionStats.sent} sent
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {suggestionStats.received} received
              </div>
              {suggestionStats.pending > 0 && (
                <div className="text-sm text-brand-primary">
                  {suggestionStats.pending} pending
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coming soon notice */}
        <div className="text-center py-8 bg-zinc-900/50 rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-2">Friend profiles coming soon</p>
          <p className="text-sm text-gray-500">
            View suggestions and shared lists with {friend?.name}
          </p>
        </div>
      </div>
    </div>
  );
}
