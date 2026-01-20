'use client';

import { useState, useEffect } from 'react';
import { X, Check, XCircle, Clock, User, List, Users } from 'lucide-react';
import Image from 'next/image';

interface CustomListInvite {
  type: 'custom_list';
  id: number;
  listSlug: string;
  listName: string;
  message: string | null;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    username: string | null;
    image: string | null;
  };
}

interface CollaborationInvite {
  type: 'collaboration';
  id: number;
  ownerName: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  ownerId: number;
  message: string | null;
  sharedLists: string[];
  createdAt: string;
}

type Invite = CustomListInvite | CollaborationInvite;

const LIST_LABELS: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  finished: 'Finished',
  onhold: 'On Hold',
  dropped: 'Dropped',
  favorites: 'Favorites',
  rewatch: 'Rewatch',
  nostalgia: 'Classics',
};

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export default function NotificationCenter({ isOpen, onClose, onCountChange }: NotificationCenterProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInvites();
    }
  }, [isOpen]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      // Fetch both custom list invites and collaboration invites in parallel
      const [customListRes, collaborationRes] = await Promise.all([
        fetch('/api/invites/pending'),
        fetch('/api/collaborators/direct-invites'),
      ]);

      const allInvites: Invite[] = [];

      if (customListRes.ok) {
        const data = await customListRes.json();
        const customInvites = (data.invites || []).map((inv: any) => ({
          ...inv,
          type: 'custom_list' as const,
        }));
        allInvites.push(...customInvites);
      }

      if (collaborationRes.ok) {
        const data = await collaborationRes.json();
        const collabInvites = (data.invites || []).map((inv: any) => ({
          ...inv,
          type: 'collaboration' as const,
        }));
        allInvites.push(...collabInvites);
      }

      // Sort by createdAt descending
      allInvites.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setInvites(allInvites);
      onCountChange(allInvites.length);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invite: Invite) => {
    setProcessingId(invite.id);
    try {
      const endpoint = invite.type === 'custom_list'
        ? `/api/invites/${invite.id}/accept`
        : `/api/collaborators/direct-invites/${invite.id}/accept`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });
      if (response.ok) {
        setInvites(prev => prev.filter(i => !(i.id === invite.id && i.type === invite.type)));
        onCountChange(invites.length - 1);
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invite: Invite) => {
    setProcessingId(invite.id);
    try {
      const endpoint = invite.type === 'custom_list'
        ? `/api/invites/${invite.id}/decline`
        : `/api/collaborators/direct-invites/${invite.id}/decline`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });
      if (response.ok) {
        setInvites(prev => prev.filter(i => !(i.id === invite.id && i.type === invite.type)));
        onCountChange(invites.length - 1);
      }
    } catch (error) {
      console.error('Failed to decline invite:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 z-50 shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin-fast rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
            </div>
          ) : invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">You're all caught up!</p>
              <p className="text-gray-500 text-sm mt-1">No pending invitations</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {invites.map((invite) => {
                const isCustomList = invite.type === 'custom_list';
                const senderName = isCustomList
                  ? (invite as CustomListInvite).sender.name
                  : (invite as CollaborationInvite).ownerName;
                const senderUsername = isCustomList
                  ? (invite as CustomListInvite).sender.username
                  : (invite as CollaborationInvite).ownerUsername;
                const senderImage = isCustomList
                  ? (invite as CustomListInvite).sender.image
                  : (invite as CollaborationInvite).ownerImage;

                return (
                  <div
                    key={`${invite.type}-${invite.id}`}
                    className="p-4 hover:bg-zinc-800/50 transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Sender Avatar */}
                      <div className="flex-shrink-0">
                        {senderImage ? (
                          <Image
                            src={senderImage}
                            alt={senderName}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="font-medium">{senderName}</span>
                          {senderUsername && (
                            <span className="text-gray-500 ml-1">@{senderUsername}</span>
                          )}
                        </p>

                        {isCustomList ? (
                          <>
                            <p className="text-sm text-gray-400 mt-0.5">
                              invited you to collaborate on
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <List className="w-4 h-4 text-[#8b5ef4]" />
                              <span className="text-sm font-medium text-white">
                                {(invite as CustomListInvite).listName}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-400 mt-0.5">
                              wants to share lists with you
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Users className="w-4 h-4 text-[#8b5ef4]" />
                              <span className="text-sm text-white">
                                {(invite as CollaborationInvite).sharedLists
                                  .map(list => LIST_LABELS[list] || list)
                                  .join(', ')}
                              </span>
                            </div>
                          </>
                        )}

                        {invite.message && (
                          <p className="text-sm text-gray-400 mt-2 italic">
                            "{invite.message}"
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(invite.createdAt)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleAccept(invite)}
                            disabled={processingId === invite.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5ef4] text-white text-sm font-medium rounded-lg hover:bg-[#7a4ed3] transition disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(invite)}
                            disabled={processingId === invite.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-zinc-600 transition disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
