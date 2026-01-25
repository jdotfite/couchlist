'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  Loader2,
  Check,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Edit3,
  Clock,
  Play,
  CheckCircle2,
  Save,
  Users,
  Plus,
  Pencil,
} from 'lucide-react';

interface Friend {
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
  canEdit: boolean;
  itemCount: number;
}

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

interface FriendSharingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  friendUserId: number;
  onSharingUpdated?: () => void;
}

const listIcons: Record<string, React.ReactNode> = {
  watchlist: <Clock className="w-5 h-5 text-blue-500" />,
  watching: <Play className="w-5 h-5 text-green-500" />,
  finished: <CheckCircle2 className="w-5 h-5 text-brand-primary" />,
};

// Core system lists only - onhold, dropped, rewatch, classics were removed
// Users can create custom lists for those use cases
const SYSTEM_LISTS = [
  { type: 'watchlist', name: 'Watchlist' },
  { type: 'watching', name: 'Watching' },
  { type: 'finished', name: 'Watched' },
];

interface ListSelection {
  listType: string;
  isShared: boolean;
  canEdit: boolean;
}

export function FriendSharingSheet({
  isOpen,
  onClose,
  friendUserId,
  onSharingUpdated,
}: FriendSharingSheetProps) {
  const [friend, setFriend] = useState<Friend | null>(null);
  const [youShare, setYouShare] = useState<SharedList[]>([]);
  const [theyShare, setTheyShare] = useState<SharedList[]>([]);
  const [collaborativeList, setCollaborativeList] = useState<CollaborativeList | null>(null);
  const [selections, setSelections] = useState<Record<string, ListSelection>>({});
  const [initialSelections, setInitialSelections] = useState<Record<string, ListSelection>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCollab, setCreatingCollab] = useState(false);

  useEffect(() => {
    if (isOpen && friendUserId) {
      fetchData();
    }
  }, [isOpen, friendUserId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/friends/${friendUserId}/sharing-summary`);
      if (response.ok) {
        const data = await response.json();
        setFriend(data.friend);
        setYouShare(data.youShare || []);
        setTheyShare(data.theyShare || []);
        setCollaborativeList(data.collaborativeList || null);

        // Initialize selections from current shared lists
        const initial: Record<string, ListSelection> = {};
        for (const list of SYSTEM_LISTS) {
          const shared = (data.youShare || []).find(
            (l: SharedList) => l.listType === list.type
          );
          initial[list.type] = {
            listType: list.type,
            isShared: !!shared,
            canEdit: shared?.canEdit || false,
          };
        }
        setSelections(initial);
        setInitialSelections(JSON.parse(JSON.stringify(initial)));
      }
    } catch (error) {
      console.error('Failed to fetch sharing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleShare = (listType: string) => {
    setSelections((prev) => ({
      ...prev,
      [listType]: {
        ...prev[listType],
        isShared: !prev[listType]?.isShared,
        canEdit: !prev[listType]?.isShared ? prev[listType]?.canEdit : false,
      },
    }));
  };

  const toggleCanEdit = (listType: string) => {
    setSelections((prev) => ({
      ...prev,
      [listType]: {
        ...prev[listType],
        canEdit: !prev[listType]?.canEdit,
      },
    }));
  };

  const hasChanges = useCallback(() => {
    for (const list of SYSTEM_LISTS) {
      const initial = initialSelections[list.type];
      const current = selections[list.type];
      if (
        initial?.isShared !== current?.isShared ||
        initial?.canEdit !== current?.canEdit
      ) {
        return true;
      }
    }
    return false;
  }, [selections, initialSelections]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const listsToShare: Array<{ listType: string; canEdit: boolean }> = [];
      const listsToRemove: string[] = [];

      for (const list of SYSTEM_LISTS) {
        const initial = initialSelections[list.type];
        const current = selections[list.type];

        if (current?.isShared && !initial?.isShared) {
          // Newly shared
          listsToShare.push({
            listType: list.type,
            canEdit: current.canEdit,
          });
        } else if (current?.isShared && initial?.isShared) {
          // Check if canEdit changed
          if (current.canEdit !== initial.canEdit) {
            listsToShare.push({
              listType: list.type,
              canEdit: current.canEdit,
            });
          }
        } else if (!current?.isShared && initial?.isShared) {
          // Removed sharing
          listsToRemove.push(list.type);
        }
      }

      const response = await fetch(`/api/friends/${friendUserId}/sharing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listsToShare, listsToRemove }),
      });

      if (response.ok) {
        setInitialSelections(JSON.parse(JSON.stringify(selections)));
        onSharingUpdated?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to save sharing settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollaborativeList = async () => {
    setCreatingCollab(true);
    try {
      const response = await fetch(`/api/friends/${friendUserId}/collaborative-list`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCollaborativeList(data.list);
      }
    } catch (error) {
      console.error('Failed to create collaborative list:', error);
    } finally {
      setCreatingCollab(false);
    }
  };

  if (!isOpen) return null;

  const sharedCount = Object.values(selections).filter((s) => s.isShared).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[70] bg-zinc-900 rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {friend && (
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
            )}
            <div>
              <h2 className="text-lg font-bold text-white">
                Sharing with {friend?.name || 'Friend'}
              </h2>
              <p className="text-sm text-gray-400">
                {sharedCount} {sharedCount === 1 ? 'list' : 'lists'} shared
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Your Lists Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-semibold text-white">Lists You Share</h3>
                </div>

                <div className="space-y-2">
                  {SYSTEM_LISTS.map((list) => {
                    const selection = selections[list.type];
                    const sharedList = youShare.find(
                      (l) => l.listType === list.type
                    );
                    const icon = listIcons[list.type] || (
                      <Eye className="w-5 h-5 text-gray-400" />
                    );

                    return (
                      <div
                        key={list.type}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                          selection?.isShared
                            ? 'bg-brand-primary/10 border-brand-primary'
                            : 'bg-zinc-800 border-zinc-700'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleShare(list.type)}
                          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition ${
                            selection?.isShared
                              ? 'bg-brand-primary'
                              : 'border-2 border-zinc-600 hover:border-zinc-500'
                          }`}
                        >
                          {selection?.isShared && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>

                        {/* Icon */}
                        <div className="flex-shrink-0">{icon}</div>

                        {/* Name and count */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white">
                            {sharedList?.listName || list.name}
                          </div>
                          <p className="text-xs text-gray-500">
                            {sharedList?.itemCount || 0} items
                          </p>
                        </div>

                        {/* View only badge - system lists don't support edit permissions */}
                        {selection?.isShared && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 text-gray-400">
                            <Eye className="w-3 h-3" />
                            View only
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Collaborative List Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-green-400" />
                  <h3 className="font-semibold text-white">Collaborative List</h3>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  A shared list you both can add to and manage together
                </p>

                {collaborativeList ? (
                  <Link
                    href={`/friends/${friendUserId}/list`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white flex items-center gap-2">
                        {collaborativeList.name}
                        <Pencil className="w-3 h-3 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-500">
                        {collaborativeList.itemCount} {collaborativeList.itemCount === 1 ? 'item' : 'items'} · Both can add
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ) : (
                  <button
                    onClick={handleCreateCollaborativeList}
                    disabled={creatingCollab}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-zinc-700 hover:border-green-500/50 hover:bg-green-500/5 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      {creatingCollab ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">
                        Create Collaborative List
                      </div>
                      <p className="text-xs text-gray-500">
                        Start a shared watchlist with {friend?.name}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Their Lists Section */}
              {theyShare.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                    <h3 className="font-semibold text-white">
                      Lists {friend?.name || 'They'} Share With You
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {theyShare.map((list) => {
                      const icon = listIcons[list.listType] || (
                        <Eye className="w-5 h-5 text-gray-400" />
                      );

                      return (
                        <Link
                          key={`${list.listType}-${list.listId || 'system'}`}
                          href={`/friends/${friendUserId}?list=${list.listType}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition"
                        >
                          <div className="flex-shrink-0">{icon}</div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white">
                              {list.listName}
                            </div>
                            <p className="text-xs text-gray-500">
                              {list.itemCount} items
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-xs">View</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {theyShare.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <ArrowDownLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {friend?.name || 'They'} hasn't shared any lists with you
                    yet
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Save Button */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:text-gray-500 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
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
    </>
  );
}
