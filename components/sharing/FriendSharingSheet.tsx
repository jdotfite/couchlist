'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  X,
  Loader2,
  ChevronRight,
  ArrowDownLeft,
  Eye,
  Users,
  Plus,
  List,
  Save,
} from 'lucide-react';
import { SYSTEM_LISTS, SYSTEM_LIST_MAP } from '@/lib/list-config';

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
            (l: SharedList) => l.listType === list.slug
          );
          initial[list.slug] = {
            listType: list.slug,
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
      const initial = initialSelections[list.slug];
      const current = selections[list.slug];
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
        const initial = initialSelections[list.slug];
        const current = selections[list.slug];

        if (current?.isShared && !initial?.isShared) {
          // Newly shared
          listsToShare.push({
            listType: list.slug,
            canEdit: current.canEdit,
          });
        } else if (current?.isShared && initial?.isShared) {
          // Check if canEdit changed
          if (current.canEdit !== initial.canEdit) {
            listsToShare.push({
              listType: list.slug,
              canEdit: current.canEdit,
            });
          }
        } else if (!current?.isShared && initial?.isShared) {
          // Removed sharing
          listsToRemove.push(list.slug);
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
  if (typeof document === 'undefined') return null;

  const sharedCount = Object.values(selections).filter((s) => s.isShared).length;

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
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {friend?.image ? (
                <img
                  src={friend.image}
                  alt={friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {friend?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{friend?.name}</p>
              {friend?.username && (
                <p className="text-sm text-gray-500">@{friend.username}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-400 mt-3">
            Choose which lists {friend?.name} can see. You can also create a shared list that you both can add to.
          </p>
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
                <div className="flex items-center gap-2 mb-1">
                  <List className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-semibold text-white">Your Lists</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Select the lists you want {friend?.name} to see
                </p>

                <div className="space-y-2">
                  {SYSTEM_LISTS.map((list) => {
                    const selection = selections[list.slug];
                    const sharedList = youShare.find(
                      (l) => l.listType === list.slug
                    );

                    return (
                      <div
                        key={list.slug}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800"
                      >
                        <div className="flex-shrink-0">
                          <ListIconWithBackground listType={list.slug} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white">
                            {sharedList?.listName || list.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {sharedList?.itemCount || 0} items
                          </p>
                        </div>
                        <Toggle
                          enabled={selection?.isShared || false}
                          onChange={() => toggleShare(list.slug)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Together Section */}
              <div className="pt-4 border-t border-zinc-800 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-brand-primary" />
                  <h3 className="font-semibold text-white">Shared Together</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  A list you both can add to
                </p>

                {collaborativeList ? (
                  <Link
                    href={`/friends/${friendUserId}/list`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">
                        {collaborativeList.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {collaborativeList.itemCount} {collaborativeList.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ) : (
                  <button
                    onClick={handleCreateCollaborativeList}
                    disabled={creatingCollab}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-zinc-700 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      {creatingCollab ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">
                        Create Shared List
                      </p>
                      <p className="text-sm text-gray-500">
                        Start a list with {friend?.name}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Their Lists Section */}
              {theyShare.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownLeft className="w-4 h-4 text-brand-primary" />
                    <h3 className="font-semibold text-white">
                      {friend?.name}'s Lists
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    Lists shared with you
                  </p>

                  <div className="space-y-2">
                    {theyShare.map((list) => (
                        <Link
                          key={`${list.listType}-${list.listId || 'system'}`}
                          href={`/friends/${friendUserId}/${list.listType}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
                        >
                          <div className="flex-shrink-0">
                            <ListIconWithBackground listType={list.listType} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white">
                              {list.listName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {list.itemCount} items
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>
                    ))}
                  </div>
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
    </>,
    document.body
  );
}
