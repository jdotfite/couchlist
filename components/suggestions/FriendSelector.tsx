'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { User, Loader2, Users } from 'lucide-react';
import type { Friend } from '@/types/sharing';

interface FriendSelectorProps {
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  disabled?: boolean;
}

export default function FriendSelector({
  selectedIds,
  onSelectionChange,
  disabled = false,
}: FriendSelectorProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (userId: number) => {
    if (disabled) return;

    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin-fast text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchFriends}
          className="mt-2 text-sm text-[#8b5ef4] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm">No friends yet</p>
        <p className="text-gray-500 text-xs mt-1">
          Add friends from your Profile to send suggestions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {friends.map((friend) => {
        const isSelected = selectedIds.includes(friend.user_id);

        return (
          <button
            key={friend.id}
            onClick={() => toggleFriend(friend.user_id)}
            disabled={disabled}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
              isSelected
                ? 'bg-[#8b5ef4]/20 border border-[#8b5ef4]/50'
                : 'hover:bg-zinc-800 border border-transparent'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Checkbox */}
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                isSelected
                  ? 'bg-[#8b5ef4] border-[#8b5ef4]'
                  : 'border-gray-500'
              }`}
            >
              {isSelected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              {friend.image ? (
                <Image
                  src={friend.image}
                  alt={friend.name}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 bg-zinc-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">{friend.name}</p>
              {friend.username && (
                <p className="text-xs text-gray-500">@{friend.username}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
