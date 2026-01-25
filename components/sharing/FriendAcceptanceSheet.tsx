'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  Eye,
  Users,
  List,
} from 'lucide-react';
import { SYSTEM_LISTS, SYSTEM_LIST_MAP } from '@/lib/list-config';

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

// Helper to render list icon with colored background (matches library page)
function ListIconWithBackground({ listType }: { listType: string }) {
  const config = SYSTEM_LIST_MAP[listType];
  if (!config) {
    return (
      <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center">
        <Eye className="w-5 h-5 text-white" />
      </div>
    );
  }
  const IconComponent = config.icon;
  return (
    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.bgColorClass} flex items-center justify-center`}>
      <IconComponent className="w-5 h-5 text-white" />
    </div>
  );
}

// Toggle component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-brand-primary' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

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
  const [validationMessage, setValidationMessage] = useState('');

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

      // Fetch counts for each list type
      const countsRes = await fetch('/api/library/counts');
      if (countsRes.ok) {
        const countsData = await countsRes.json();
        Object.assign(listCounts, countsData.counts || {});
      }

      // Build list options from centralized config
      const options: ListOption[] = SYSTEM_LISTS.map(config => ({
        listType: config.slug,
        listName: config.title,
        itemCount: listCounts[config.slug] || 0,
        isDefault: false,
      }));

      // Get default sharing preferences
      const defaultListTypes = new Set<string>();
      if (defaultsRes.ok) {
        const defaultsData = await defaultsRes.json();
        // API returns { systemLists: [...], customLists: [...] }
        const defaultSystemLists = defaultsData.systemLists || [];
        defaultSystemLists.forEach((d: { listType: string; shareByDefault: boolean }) => {
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

  const handleContinue = async () => {
    // Validate that at least one list is selected or collaborative list is enabled
    if (selectedLists.size === 0 && !createCollaborativeList) {
      setValidationMessage('Choose a list to share or create a shared list');
      setTimeout(() => setValidationMessage(''), 3000);
      return;
    }

    setAccepting(true);
    setValidationMessage('');

    try {
      const acceptRes = await fetch(`/api/collaborators/direct-invites/${inviteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lists: Array.from(selectedLists),
          createCollaborativeList,
        }),
      });

      if (!acceptRes.ok) {
        const errorData = await acceptRes.json().catch(() => ({}));
        console.error('[FriendAcceptanceSheet] Accept failed:', errorData);
        throw new Error('Failed to accept invite');
      }

      const acceptData = await acceptRes.json().catch(() => ({}));

      // Use friendUserId from accept response, fallback to friend.id
      const friendUserId = acceptData.friendUserId || friend.id;

      // Create collaborative list if opted in
      let collaborativeListName: string | undefined;
      if (createCollaborativeList) {
        console.log('[FriendAcceptanceSheet] Creating collaborative list with friendUserId:', friendUserId);
        const collabRes = await fetch(`/api/friends/${friendUserId}/collaborative-list`, {
          method: 'POST',
        });

        if (collabRes.ok) {
          const collabData = await collabRes.json();
          collaborativeListName = collabData.list?.name;
          console.log('[FriendAcceptanceSheet] Created collaborative list:', collaborativeListName);
        } else {
          const errorData = await collabRes.json().catch(() => ({}));
          console.error('[FriendAcceptanceSheet] Failed to create collaborative list:', collabRes.status, errorData);
        }
      }

      // Notify the friend (who sent the invite) about what was shared
      try {
        await fetch(`/api/friends/${friendUserId}/notify-acceptance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sharedLists: Array.from(selectedLists),
            createdCollaborativeList: createCollaborativeList,
            collaborativeListName,
          }),
        });
      } catch (notifyError) {
        console.error('Failed to send acceptance notification:', notifyError);
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[130] bg-zinc-900 rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {friend.image ? (
                <img
                  src={friend.image}
                  alt={friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {friend.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{friend.name}</p>
              {friend.username && (
                <p className="text-sm text-gray-500">@{friend.username}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-3">
            Choose which lists {friend.name} can see. You can also create a shared list that you both can add to.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Your Lists Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <List className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-semibold text-white">Your Lists</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Select the lists you want {friend.name} to see
                </p>

                <div className="space-y-2">
                  {lists.map((list) => {
                    const isSelected = selectedLists.has(list.listType);

                    return (
                      <div
                        key={list.listType}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800"
                      >
                        <div className="flex-shrink-0">
                          <ListIconWithBackground listType={list.listType} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white">{list.listName}</p>
                          <p className="text-sm text-gray-500">
                            {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                        <Toggle
                          enabled={isSelected}
                          onChange={() => toggleList(list.listType)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Together Section */}
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-semibold text-white">Shared Together</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Create a list you both can add to
                </p>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">
                      {userName && friend.name ? `${userName} & ${friend.name}` : 'Shared Watchlist'}
                    </p>
                    <p className="text-sm text-gray-500">
                      A collaborative list you both can edit
                    </p>
                  </div>
                  <Toggle
                    enabled={createCollaborativeList}
                    onChange={() => setCreateCollaborativeList(!createCollaborativeList)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pb-6 border-t border-zinc-800 bg-zinc-900 space-y-2 flex-shrink-0">
          {/* Validation message */}
          {validationMessage && (
            <div className="text-center text-sm text-feedback-warning-soft py-2">
              {validationMessage}
            </div>
          )}
          <button
            onClick={handleContinue}
            disabled={accepting}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 rounded-xl font-semibold transition flex items-center justify-center"
          >
            {accepting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Continue'
            )}
          </button>
          <button
            onClick={handleSkip}
            disabled={accepting}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl font-medium transition text-gray-400"
          >
            Don't share yet
          </button>
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
    </>,
    document.body
  );
}
