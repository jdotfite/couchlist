'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Check,
  UserPlus,
  Clock,
  Play,
  CheckCircle2,
  Eye,
  Share2,
  Users,
} from 'lucide-react';

interface FriendInfo {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
}

interface ListOption {
  listType: string;
  listName: string;
  itemCount: number;
  isDefault: boolean;
}

interface FriendAcceptanceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  friend: FriendInfo;
  inviteId: number;
  onAccepted: () => void;
}

const listIcons: Record<string, React.ReactNode> = {
  watchlist: <Clock className="w-5 h-5 text-blue-500" />,
  watching: <Play className="w-5 h-5 text-green-500" />,
  finished: <CheckCircle2 className="w-5 h-5 text-brand-primary" />,
};

const LIST_NAMES: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  finished: 'Watched',
};

export function FriendAcceptanceSheet({
  isOpen,
  onClose,
  friend,
  inviteId,
  onAccepted,
}: FriendAcceptanceSheetProps) {
  const [lists, setLists] = useState<ListOption[]>([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [createCollaborativeList, setCreateCollaborativeList] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchListsAndDefaults();
    }
  }, [isOpen]);

  const fetchListsAndDefaults = async () => {
    setLoading(true);
    try {
      // Fetch user's lists, default sharing preferences, and user info in parallel
      const [listsRes, defaultsRes, userRes] = await Promise.all([
        fetch('/api/list-visibility'),
        fetch('/api/list-visibility/defaults'),
        fetch('/api/user/me'),
      ]);

      // Get current user's name for collaborative list naming
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserName(userData.name || '');
      }

      // Get list item counts
      const listCounts: Record<string, number> = {};
      // Core system lists only - onhold, dropped, rewatch, classics were removed
      const systemLists = ['watchlist', 'watching', 'finished'];

      // Fetch counts for each list type
      const countsRes = await fetch('/api/library/counts');
      if (countsRes.ok) {
        const countsData = await countsRes.json();
        Object.assign(listCounts, countsData.counts || {});
      }

      // Build list options
      const options: ListOption[] = systemLists.map(listType => ({
        listType,
        listName: LIST_NAMES[listType] || listType,
        itemCount: listCounts[listType] || 0,
        isDefault: false,
      }));

      // Get default sharing preferences
      const defaultListTypes = new Set<string>();
      if (defaultsRes.ok) {
        const defaultsData = await defaultsRes.json();
        // API returns { systemLists: [...], customLists: [...] }
        const systemLists = defaultsData.systemLists || [];
        systemLists.forEach((d: { listType: string; shareByDefault: boolean }) => {
          if (d.shareByDefault) {
            defaultListTypes.add(d.listType);
          }
        });
      }

      // Mark defaults
      options.forEach(opt => {
        opt.isDefault = defaultListTypes.has(opt.listType);
      });

      setLists(options);
      setSelectedLists(defaultListTypes);
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleList = (listType: string) => {
    setSelectedLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listType)) {
        newSet.delete(listType);
      } else {
        newSet.add(listType);
      }
      return newSet;
    });
  };

  const handleAccept = async () => {
    setAccepting(true);

    // Debug: Log what we're about to do
    console.log('[FriendAcceptanceSheet] Starting acceptance');
    console.log('[FriendAcceptanceSheet] friend.id (URL param):', friend.id);
    console.log('[FriendAcceptanceSheet] inviteId:', inviteId);
    console.log('[FriendAcceptanceSheet] selectedLists:', Array.from(selectedLists));
    console.log('[FriendAcceptanceSheet] createCollaborativeList:', createCollaborativeList);

    try {
      // First accept the invite
      console.log('[FriendAcceptanceSheet] Calling accept endpoint...');
      const acceptRes = await fetch(`/api/collaborators/direct-invites/${inviteId}/accept`, {
        method: 'POST',
      });

      if (!acceptRes.ok) {
        const errorData = await acceptRes.json().catch(() => ({}));
        console.error('[FriendAcceptanceSheet] Accept failed:', errorData);
        throw new Error('Failed to accept invite');
      }
      console.log('[FriendAcceptanceSheet] Accept succeeded');

      // Then set up sharing for selected lists
      console.log('[FriendAcceptanceSheet] selectedLists.size:', selectedLists.size);
      console.log('[FriendAcceptanceSheet] selectedLists contents:', Array.from(selectedLists));

      if (selectedLists.size > 0) {
        const listsToShare = Array.from(selectedLists).map(listType => ({
          listType,
          canEdit: false, // Default to view-only
        }));
        console.log('[FriendAcceptanceSheet] About to call sharing PATCH with:', listsToShare);
        console.log('[FriendAcceptanceSheet] friend.id:', friend.id, 'type:', typeof friend.id);

        try {
          const sharingRes = await fetch(`/api/friends/${friend.id}/sharing`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              listsToShare,
              listsToRemove: [],
            }),
          });

          const sharingData = await sharingRes.json().catch(() => ({}));
          console.log('[FriendAcceptanceSheet] Sharing response:', sharingRes.status, sharingData);

          if (!sharingRes.ok) {
            console.error('[FriendAcceptanceSheet] Failed to set up sharing:', sharingData);
            // Continue anyway - friendship was established, sharing can be set up later
          } else {
            console.log('[FriendAcceptanceSheet] Sharing setup successful');
          }
        } catch (sharingError) {
          console.error('[FriendAcceptanceSheet] Exception during sharing setup:', sharingError);
        }
      } else {
        console.log('[FriendAcceptanceSheet] No lists selected, skipping sharing setup');
      }

      // Create collaborative list if opted in
      let collaborativeListName: string | undefined;
      if (createCollaborativeList) {
        const collabRes = await fetch(`/api/friends/${friend.id}/collaborative-list`, {
          method: 'POST',
        });

        if (collabRes.ok) {
          const collabData = await collabRes.json();
          collaborativeListName = collabData.list?.name;
        } else {
          const errorData = await collabRes.json().catch(() => ({}));
          console.error('Failed to create collaborative list:', errorData);
          // Continue anyway - friendship was established
        }
      }

      // Notify the friend (who sent the invite) about what was shared
      try {
        await fetch(`/api/friends/${friend.id}/notify-acceptance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sharedLists: Array.from(selectedLists),
            createdCollaborativeList,
            collaborativeListName,
          }),
        });
      } catch (notifyError) {
        console.error('Failed to send acceptance notification:', notifyError);
        // Non-critical, continue
      }

      onAccepted();
      onClose();
    } catch (error) {
      console.error('Failed to accept friend:', error);
    } finally {
      setAccepting(false);
    }
  };

  const handleSkip = async () => {
    setAccepting(true);
    try {
      // Just accept without sharing any lists
      const acceptRes = await fetch(`/api/collaborators/direct-invites/${inviteId}/accept`, {
        method: 'POST',
      });

      if (acceptRes.ok) {
        onAccepted();
        onClose();
      }
    } catch (error) {
      console.error('Failed to accept friend:', error);
    } finally {
      setAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[130] bg-zinc-900 rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                New Friend!
              </h2>
              <p className="text-sm text-gray-400">
                You're now connected with {friend.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
              {friend.image ? (
                <img
                  src={friend.image}
                  alt={friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {friend.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-white">{friend.name}</p>
              {friend.username && (
                <p className="text-xs text-gray-500">@{friend.username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-280px)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-brand-primary" />
            <h3 className="font-semibold text-white">Share Lists with {friend.name}?</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Choose which of your lists {friend.name} can see. You can change this anytime.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {lists.map((list) => {
                  const isSelected = selectedLists.has(list.listType);
                  const icon = listIcons[list.listType] || (
                    <Eye className="w-5 h-5 text-gray-400" />
                  );

                  return (
                    <button
                      key={list.listType}
                      onClick={() => toggleList(list.listType)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary'
                          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-brand-primary'
                            : 'border-2 border-zinc-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Icon */}
                      <div className="flex-shrink-0">{icon}</div>

                      {/* Name */}
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white flex items-center gap-2">
                          {list.listName}
                          {list.isDefault && (
                            <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-gray-400">
                              default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Collaborative List Option */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-green-400" />
                  <h3 className="font-semibold text-white">Collaborative List</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Create a shared list you both can add to
                </p>

                <button
                  onClick={() => setCreateCollaborativeList(!createCollaborativeList)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${
                    createCollaborativeList
                      ? 'bg-green-500/10 border-green-500'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                      createCollaborativeList
                        ? 'bg-green-500'
                        : 'border-2 border-zinc-600'
                    }`}
                  >
                    {createCollaborativeList && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>

                  {/* Name */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-white">
                      {userName && friend.name ? `${userName} & ${friend.name}` : 'Shared Watchlist'}
                    </div>
                    <p className="text-xs text-gray-500">
                      Both of you can add and manage items
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 space-y-2">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            {accepting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                {selectedLists.size > 0
                  ? `Share ${selectedLists.size} ${selectedLists.size === 1 ? 'List' : 'Lists'}`
                  : 'Continue Without Sharing'}
              </>
            )}
          </button>

          {selectedLists.size > 0 && (
            <button
              onClick={handleSkip}
              disabled={accepting}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl font-medium transition text-gray-300"
            >
              Skip for now
            </button>
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
