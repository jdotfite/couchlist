'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Users,
  UserPlus,
  Copy,
  Check,
  Trash2,
  ChevronLeft,
  Loader2,
  AlertCircle,
  XCircle,
  Link2,
  Search,
  X,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import { StateDisplay } from '@/components/ui';

interface Partner {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: string;
}

interface Friend {
  collaboratorId: number;
  userId: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: string;
  suggestionStats: {
    sent: number;
    received: number;
    pending: number;
  };
}

interface PendingInvite {
  id: number;
  inviteCode: string;
  inviteUrl: string;
  type: 'partner' | 'friend';
  createdAt: string;
  expiresAt: string;
}

export default function SharingSettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  // Data state
  const [partner, setPartner] = useState<Partner | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Partner invite modal state
  const [showPartnerInviteModal, setShowPartnerInviteModal] = useState(false);
  const [partnerInviteTab, setPartnerInviteTab] = useState<'search' | 'link'>('search');
  const [partnerInviteUrl, setPartnerInviteUrl] = useState<string | null>(null);
  const [partnerInviteLoading, setPartnerInviteLoading] = useState(false);
  const [partnerInviteSent, setPartnerInviteSent] = useState(false);

  // Friend invite modal state
  const [showFriendInviteModal, setShowFriendInviteModal] = useState(false);
  const [friendInviteTab, setFriendInviteTab] = useState<'search' | 'link'>('search');
  const [friendInviteUrl, setFriendInviteUrl] = useState<string | null>(null);
  const [friendInviteLoading, setFriendInviteLoading] = useState(false);
  const [friendInviteSent, setFriendInviteSent] = useState(false);

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; username: string | null; image: string | null }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; username: string | null; image: string | null } | null>(null);

  // Remove/revoke state
  const [removingPartnerId, setRemovingPartnerId] = useState<number | null>(null);
  const [removingFriendId, setRemovingFriendId] = useState<number | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Portal mount state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch partner and friends in parallel
      const [partnerRes, friendsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/friends'),
      ]);

      const partnerData = await partnerRes.json();
      const friendsData = await friendsRes.json();

      if (partnerRes.ok && partnerData.partner) {
        setPartner(partnerData.partner);
      }

      if (friendsRes.ok) {
        setFriends(friendsData.friends || []);
      }

      // Fetch pending invites from both partner and friend endpoints
      const partnerPendingRes = await fetch('/api/partners/pending-invites');
      const friendPendingRes = await fetch('/api/friends/pending-invites');

      const partnerPending = partnerPendingRes.ok ? await partnerPendingRes.json() : { invites: [] };
      const friendPending = friendPendingRes.ok ? await friendPendingRes.json() : { invites: [] };

      const allPending = [
        ...(partnerPending.invites || []).map((inv: PendingInvite) => ({ ...inv, type: 'partner' as const })),
        ...(friendPending.invites || []).map((inv: PendingInvite) => ({ ...inv, type: 'friend' as const })),
      ];
      setPendingInvites(allPending);
    } catch (err) {
      setError('Failed to load sharing data');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/connections?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Partner invite functions
  const createPartnerInviteLink = async () => {
    setPartnerInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create partner invite');
        return;
      }

      setPartnerInviteUrl(data.inviteUrl);
      fetchData(); // Refresh to show pending invite
    } catch (err) {
      setError('Failed to create partner invite');
    } finally {
      setPartnerInviteLoading(false);
    }
  };

  const sendDirectPartnerInvite = async () => {
    if (!selectedUser) return;

    setPartnerInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/partners/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send partner invite');
        return;
      }

      setPartnerInviteSent(true);
    } catch (err) {
      setError('Failed to send partner invite');
    } finally {
      setPartnerInviteLoading(false);
    }
  };

  const removePartner = async () => {
    if (!partner) return;

    try {
      const response = await fetch('/api/partners', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to remove partner');
        return;
      }

      setPartner(null);
      setRemovingPartnerId(null);
    } catch (err) {
      setError('Failed to remove partner');
    }
  };

  // Friend invite functions
  const createFriendInviteLink = async () => {
    setFriendInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create friend invite');
        return;
      }

      setFriendInviteUrl(data.inviteUrl);
      fetchData(); // Refresh to show pending invite
    } catch (err) {
      setError('Failed to create friend invite');
    } finally {
      setFriendInviteLoading(false);
    }
  };

  const sendDirectFriendInvite = async () => {
    if (!selectedUser) return;

    setFriendInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/friends/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send friend invite');
        return;
      }

      setFriendInviteSent(true);
    } catch (err) {
      setError('Failed to send friend invite');
    } finally {
      setFriendInviteLoading(false);
    }
  };

  const removeFriend = async (collaboratorId: number) => {
    try {
      const response = await fetch(`/api/friends/${collaboratorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to remove friend');
        return;
      }

      setFriends(prev => prev.filter(f => f.collaboratorId !== collaboratorId));
      setRemovingFriendId(null);
    } catch (err) {
      setError('Failed to remove friend');
    }
  };

  // Revoke pending invite
  const revokeInvite = async (inviteId: number, type: 'partner' | 'friend') => {
    setRevokingInviteId(inviteId);
    try {
      const endpoint = type === 'partner'
        ? `/api/partners/pending-invites/${inviteId}`
        : `/api/friends/pending-invites/${inviteId}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (response.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to revoke invite');
      }
    } catch (err) {
      setError('Failed to revoke invite');
    } finally {
      setRevokingInviteId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetPartnerModal = () => {
    setShowPartnerInviteModal(false);
    setPartnerInviteTab('search');
    setPartnerInviteUrl(null);
    setPartnerInviteSent(false);
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const resetFriendModal = () => {
    setShowFriendInviteModal(false);
    setFriendInviteTab('search');
    setFriendInviteUrl(null);
    setFriendInviteSent(false);
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const partnerPendingInvites = pendingInvites.filter(inv => inv.type === 'partner');
  const friendPendingInvites = pendingInvites.filter(inv => inv.type === 'friend');

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Sharing</h1>
            <p className="text-xs text-gray-400">Friends & List Sharing</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Partner Section (Deprecated) */}
        <section className="opacity-75">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-pink-500" />
            </div>
            <div>
              <h2 className="font-semibold">Partner <span className="text-xs text-yellow-500 font-normal">(Legacy)</span></h2>
              <p className="text-xs text-gray-500">Being replaced by Friends with sharing permissions</p>
            </div>
          </div>

          {/* Deprecation notice */}
          {!partner && partnerPendingInvites.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-200">
                Partner mode is being phased out. Use the Friends system below with list sharing instead.
              </p>
            </div>
          )}

          {/* Partner pending invites */}
          {partnerPendingInvites.length > 0 && !partner && (
            <div className="mb-4 space-y-2">
              {partnerPendingInvites.map((invite) => {
                const expiresAt = new Date(invite.expiresAt);
                const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={invite.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Partner Invite Link</h3>
                          <p className="text-xs text-gray-500">
                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => revokeInvite(invite.id, 'partner')}
                        disabled={revokingInviteId === invite.id}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400 disabled:opacity-50"
                      >
                        {revokingInviteId === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => copyToClipboard(invite.inviteUrl)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connected partner */}
          {partner ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
                    {partner.image ? (
                      <img src={partner.image} alt={partner.name} className="w-12 h-12 rounded-full" />
                    ) : (
                      <span className="text-pink-500 font-semibold text-lg">
                        {partner.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{partner.name}</h3>
                    {partner.username && (
                      <p className="text-xs text-gray-500">@{partner.username}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Connected {new Date(partner.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {removingPartnerId !== partner.id && (
                  <button
                    onClick={() => setRemovingPartnerId(partner.id)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Partner Lists link */}
              <Link
                href="/partner-lists"
                className="mt-4 flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
              >
                <span className="text-sm font-medium">View Partner Lists</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              {/* Remove partner confirmation */}
              {removingPartnerId === partner.id && (
                <div className="mt-4 pt-4 border-t border-zinc-700">
                  <p className="text-sm text-gray-300 mb-3">
                    End partnership with {partner.name}?
                  </p>
                  <ul className="text-xs text-gray-500 mb-4 space-y-1">
                    <li>• Partner lists will be deleted</li>
                    <li>• Items will remain in your personal library</li>
                    <li>• {partner.name} will be notified</li>
                  </ul>
                  <div className="flex gap-2">
                    <button
                      onClick={removePartner}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition"
                    >
                      End Partnership
                    </button>
                    <button
                      onClick={() => setRemovingPartnerId(null)}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No partner - show invite button */
            <button
              onClick={() => setShowPartnerInviteModal(true)}
              disabled={partnerPendingInvites.length > 0}
              className="w-full p-4 border-2 border-dashed border-zinc-700 hover:border-pink-500 disabled:hover:border-zinc-700 rounded-xl transition flex items-center justify-center gap-3 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed group"
            >
              <Heart className="w-5 h-5 group-hover:text-pink-500 transition" />
              <span className="font-medium">
                {partnerPendingInvites.length > 0 ? 'Invite Pending' : 'Add Partner'}
              </span>
            </button>
          )}
        </section>

        {/* Friends Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h2 className="font-semibold">Friends</h2>
                <p className="text-xs text-gray-500">Send and receive suggestions</p>
              </div>
            </div>
            <button
              onClick={() => setShowFriendInviteModal(true)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
            >
              <UserPlus className="w-5 h-5 text-blue-500" />
            </button>
          </div>

          {/* Friend pending invites */}
          {friendPendingInvites.length > 0 && (
            <div className="mb-4 space-y-2">
              {friendPendingInvites.map((invite) => {
                const expiresAt = new Date(invite.expiresAt);
                const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={invite.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Friend Invite Link</h3>
                          <p className="text-xs text-gray-500">
                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => revokeInvite(invite.id, 'friend')}
                        disabled={revokingInviteId === invite.id}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400 disabled:opacity-50"
                      >
                        {revokingInviteId === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => copyToClipboard(invite.inviteUrl)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Friends list */}
          {friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.collaboratorId}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                        {friend.image ? (
                          <img src={friend.image} alt={friend.name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-blue-500 font-semibold">
                            {friend.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{friend.name}</h3>
                        {friend.username && (
                          <p className="text-xs text-gray-500">@{friend.username}</p>
                        )}
                      </div>
                    </div>

                    {removingFriendId !== friend.collaboratorId && (
                      <button
                        onClick={() => setRemovingFriendId(friend.collaboratorId)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Suggestion stats */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {friend.suggestionStats.sent} sent
                    </span>
                    <span>{friend.suggestionStats.received} received</span>
                    {friend.suggestionStats.pending > 0 && (
                      <span className="text-brand-primary">{friend.suggestionStats.pending} pending</span>
                    )}
                  </div>

                  {/* Remove friend confirmation */}
                  {removingFriendId === friend.collaboratorId && (
                    <div className="mt-4 pt-4 border-t border-zinc-700">
                      <p className="text-sm text-gray-300 mb-3">
                        Remove {friend.name} as friend?
                      </p>
                      <ul className="text-xs text-gray-500 mb-4 space-y-1">
                        <li>• You won't be able to send each other suggestions</li>
                        <li>• Accepted suggestions stay in your library</li>
                      </ul>
                      <div className="flex gap-2">
                        <button
                          onClick={() => removeFriend(friend.collaboratorId)}
                          className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition"
                        >
                          Remove Friend
                        </button>
                        <button
                          onClick={() => setRemovingFriendId(null)}
                          className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* No friends - show empty state */
            friendPendingInvites.length === 0 && (
              <div className="text-center py-8 bg-zinc-900 rounded-xl">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-gray-400 text-sm">
                  Add friends to send and receive suggestions
                </p>
              </div>
            )
          )}
        </section>
      </main>

      {/* Partner Invite Modal */}
      {showPartnerInviteModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={resetPartnerModal}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Add Partner</h2>
            <p className="text-gray-400 text-sm mb-4">
              Partners share lists bidirectionally and can track what you've watched together.
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setPartnerInviteTab('search')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  partnerInviteTab === 'search'
                    ? 'bg-pink-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                Find User
              </button>
              <button
                onClick={() => setPartnerInviteTab('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  partnerInviteTab === 'link'
                    ? 'bg-pink-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Share Link
              </button>
            </div>

            {/* Search Tab */}
            {partnerInviteTab === 'search' && !partnerInviteSent && (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase();
                        setSearchQuery(value);
                        searchUsers(value);
                      }}
                      placeholder="Search by name or @username"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 lowercase"
                    />
                  </div>

                  {/* Search results */}
                  {searchLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}

                  {!searchLoading && searchResults.length > 0 && (
                    <div className="mt-2 bg-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery(user.name);
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition"
                        >
                          <div className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user.image ? (
                              <img src={user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-pink-500 font-semibold text-sm">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{user.name}</p>
                            {user.username && (
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">No users found</p>
                  )}
                </div>

                {/* Selected user */}
                {selectedUser && (
                  <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {selectedUser.image ? (
                        <img src={selectedUser.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-pink-500 font-semibold">
                          {selectedUser.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedUser.name}</p>
                      {selectedUser.username && (
                        <p className="text-xs text-gray-400">@{selectedUser.username}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery('');
                      }}
                      className="p-1 hover:bg-zinc-700 rounded"
                    >
                      <XCircle className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                <button
                  onClick={sendDirectPartnerInvite}
                  disabled={partnerInviteLoading || !selectedUser}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {partnerInviteLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      Send Partner Invite
                    </>
                  )}
                </button>
              </>
            )}

            {/* Direct invite sent success */}
            {partnerInviteTab === 'search' && partnerInviteSent && (
              <StateDisplay
                icon={Check}
                variant="success"
                title="Invite Sent!"
                message={`${selectedUser?.name} will see your partner invitation in their notifications.`}
                buttonText="Done"
                onButtonClick={resetPartnerModal}
              />
            )}

            {/* Link Tab */}
            {partnerInviteTab === 'link' && !partnerInviteUrl && (
              <>
                <p className="text-gray-400 text-sm mb-6">
                  Create a link to share with your partner. They can accept using this link.
                </p>

                <button
                  onClick={createPartnerInviteLink}
                  disabled={partnerInviteLoading}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {partnerInviteLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      Create Invite Link
                    </>
                  )}
                </button>
              </>
            )}

            {/* Link created success */}
            {partnerInviteTab === 'link' && partnerInviteUrl && (
              <>
                <div className="mb-6">
                  <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-300 break-all font-mono">
                      {partnerInviteUrl}
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(partnerInviteUrl)}
                    className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark rounded-xl font-semibold transition flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This link expires in 7 days
                </p>
              </>
            )}

            {/* Close button */}
            <button
              onClick={resetPartnerModal}
              className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
            >
              {partnerInviteUrl || partnerInviteSent ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Friend Invite Modal */}
      {showFriendInviteModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={resetFriendModal}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Add Friend</h2>
            <p className="text-gray-400 text-sm mb-4">
              Friends can send you movie and TV show suggestions that appear in your notifications.
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFriendInviteTab('search')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  friendInviteTab === 'search'
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                Find User
              </button>
              <button
                onClick={() => setFriendInviteTab('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  friendInviteTab === 'link'
                    ? 'bg-blue-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Share Link
              </button>
            </div>

            {/* Search Tab */}
            {friendInviteTab === 'search' && !friendInviteSent && (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase();
                        setSearchQuery(value);
                        searchUsers(value);
                      }}
                      placeholder="Search by name or @username"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 lowercase"
                    />
                  </div>

                  {/* Search results */}
                  {searchLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}

                  {!searchLoading && searchResults.length > 0 && (
                    <div className="mt-2 bg-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchQuery(user.name);
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-zinc-700 transition"
                        >
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user.image ? (
                              <img src={user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-blue-500 font-semibold text-sm">
                                {user.name?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{user.name}</p>
                            {user.username && (
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">No users found</p>
                  )}
                </div>

                {/* Selected user */}
                {selectedUser && (
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {selectedUser.image ? (
                        <img src={selectedUser.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-500 font-semibold">
                          {selectedUser.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{selectedUser.name}</p>
                      {selectedUser.username && (
                        <p className="text-xs text-gray-400">@{selectedUser.username}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery('');
                      }}
                      className="p-1 hover:bg-zinc-700 rounded"
                    >
                      <XCircle className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                <button
                  onClick={sendDirectFriendInvite}
                  disabled={friendInviteLoading || !selectedUser}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {friendInviteLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Send Friend Invite
                    </>
                  )}
                </button>
              </>
            )}

            {/* Direct invite sent success */}
            {friendInviteTab === 'search' && friendInviteSent && (
              <StateDisplay
                icon={Check}
                variant="success"
                title="Invite Sent!"
                message={`${selectedUser?.name} will see your friend invitation in their notifications.`}
                buttonText="Done"
                onButtonClick={resetFriendModal}
              />
            )}

            {/* Link Tab */}
            {friendInviteTab === 'link' && !friendInviteUrl && (
              <>
                <p className="text-gray-400 text-sm mb-6">
                  Create a link to share with friends. They can accept using this link.
                </p>

                <button
                  onClick={createFriendInviteLink}
                  disabled={friendInviteLoading}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {friendInviteLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      Create Invite Link
                    </>
                  )}
                </button>
              </>
            )}

            {/* Link created success */}
            {friendInviteTab === 'link' && friendInviteUrl && (
              <>
                <div className="mb-6">
                  <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-300 break-all font-mono">
                      {friendInviteUrl}
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(friendInviteUrl)}
                    className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark rounded-xl font-semibold transition flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This link expires in 7 days
                </p>
              </>
            )}

            {/* Close button */}
            <button
              onClick={resetFriendModal}
              className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
            >
              {friendInviteUrl || friendInviteSent ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
