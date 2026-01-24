'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Users,
  Globe,
  UserPlus,
  Loader2,
  Check,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import type { VisibilityLevel, FriendListAccess } from '@/types/sharing';

interface Friend {
  id: number;
  user_id: number;
  name: string;
  username: string | null;
  image: string | null;
}

interface ListVisibilitySheetProps {
  isOpen: boolean;
  onClose: () => void;
  listType: string;
  listId?: number | null;
  listName: string;
  onVisibilityUpdated?: () => void;
}

const visibilityOptions: Array<{
  value: VisibilityLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see this list',
    icon: <EyeOff className="w-5 h-5" />,
  },
  {
    value: 'select_friends',
    label: 'Select Friends',
    description: 'Only friends you choose can see',
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: 'friends',
    label: 'All Friends',
    description: 'All your friends can see this list',
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone with the link can see',
    icon: <Globe className="w-5 h-5" />,
  },
];

export function ListVisibilitySheet({
  isOpen,
  onClose,
  listType,
  listId = null,
  listName,
  onVisibilityUpdated,
}: ListVisibilitySheetProps) {
  const [visibility, setVisibility] = useState<VisibilityLevel>('private');
  const [friendsWithAccess, setFriendsWithAccess] = useState<FriendListAccess[]>([]);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddFriends, setShowAddFriends] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, listType, listId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current visibility and friends with access
      const url = listId
        ? `/api/list-visibility/${listType}?listId=${listId}`
        : `/api/list-visibility/${listType}`;

      const [visResponse, friendsResponse] = await Promise.all([
        fetch(url),
        fetch('/api/friends'),
      ]);

      if (visResponse.ok) {
        const visData = await visResponse.json();
        setVisibility(visData.visibility || 'private');
        setFriendsWithAccess(visData.friends || []);
      }

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setAllFriends(friendsData.friends || friendsData || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: VisibilityLevel) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/list-visibility/${listType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility: newVisibility,
          listId,
        }),
      });

      if (response.ok) {
        setVisibility(newVisibility);
        onVisibilityUpdated?.();

        // If switching to select_friends, show the add friends section
        if (newVisibility === 'select_friends') {
          setShowAddFriends(true);
        }
      }
    } catch (err) {
      console.error('Failed to update visibility:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFriend = async (friendId: number) => {
    setSaving(true);
    try {
      const url = listId
        ? `/api/list-visibility/${listType}/friends?listId=${listId}`
        : `/api/list-visibility/${listType}/friends`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendId,
          listId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFriendsWithAccess(data.friends || []);
        setVisibility(data.visibility || visibility);
        onVisibilityUpdated?.();
      }
    } catch (err) {
      console.error('Failed to add friend:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    setSaving(true);
    try {
      const url = listId
        ? `/api/list-visibility/${listType}/friends?friendId=${friendId}&listId=${listId}`
        : `/api/list-visibility/${listType}/friends?friendId=${friendId}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setFriendsWithAccess(data.friends || []);
        onVisibilityUpdated?.();
      }
    } catch (err) {
      console.error('Failed to remove friend:', err);
    } finally {
      setSaving(false);
    }
  };

  // Get friends who don't have access yet
  const friendsWithoutAccess = allFriends.filter(
    (friend) => !friendsWithAccess.some((f) => f.friendId === friend.user_id)
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-zinc-900 rounded-t-2xl max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Who can see this list?</h2>
            <p className="text-sm text-gray-400">{listName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Visibility options */}
              <div className="space-y-2 mb-6">
                {visibilityOptions.map((option) => {
                  const isSelected = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleVisibilityChange(option.value)}
                      disabled={saving}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border transition ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary'
                          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-brand-primary text-white' : 'bg-zinc-700 text-gray-400'
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white">{option.label}</div>
                        <div className="text-sm text-gray-400">{option.description}</div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-brand-primary" />}
                    </button>
                  );
                })}
              </div>

              {/* Friends with access (for select_friends visibility) */}
              {visibility === 'select_friends' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Friends with access</h3>
                    {friendsWithoutAccess.length > 0 && (
                      <button
                        onClick={() => setShowAddFriends(!showAddFriends)}
                        className="flex items-center gap-1 text-brand-primary text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    )}
                  </div>

                  {/* Add friends section */}
                  {showAddFriends && friendsWithoutAccess.length > 0 && (
                    <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                      <p className="text-sm text-gray-400 mb-2">Select friends to add:</p>
                      {friendsWithoutAccess.map((friend) => (
                        <button
                          key={friend.user_id}
                          onClick={() => handleAddFriend(friend.user_id)}
                          disabled={saving}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center overflow-hidden">
                            {friend.image ? (
                              <img
                                src={friend.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-white">
                                {friend.name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-white text-sm">{friend.name}</div>
                            {friend.username && (
                              <div className="text-xs text-gray-500">@{friend.username}</div>
                            )}
                          </div>
                          <UserPlus className="w-4 h-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* List of friends with access */}
                  {friendsWithAccess.length > 0 ? (
                    <div className="space-y-2">
                      {friendsWithAccess.map((friend) => (
                        <div
                          key={friend.friendId}
                          className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                            {friend.friendImage ? (
                              <img
                                src={friend.friendImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-white">
                                {friend.friendName?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{friend.friendName}</div>
                            {friend.friendUsername && (
                              <div className="text-sm text-gray-500">@{friend.friendUsername}</div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveFriend(friend.friendId)}
                            disabled={saving}
                            className="p-2 text-gray-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No friends added yet</p>
                      <p className="text-sm">Add friends to let them see this list</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
