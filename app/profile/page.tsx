'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ChevronRight, Bell, Shield, Share2, Upload, Download,
  LogOut, Settings, Film, Tv, Heart, Users, UserPlus,
  Search, Loader2, XCircle, X, Check, Trash2, MessageCircle
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useProfileImage } from '@/hooks/useProfileImage';

interface LibraryCounts {
  movies: number;
  tv: number;
  total: number;
}

interface Partner {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: string;
}

interface Friend {
  collaboratorId: number;
  oduserId: number;
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
  type: 'partner' | 'friend';
  targetUser?: {
    id: number;
    name: string;
    username: string | null;
  };
  createdAt: string;
  expiresAt: string;
}

interface SearchUser {
  id: number;
  name: string;
  username: string | null;
  image: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { profileImage } = useProfileImage();
  const [counts, setCounts] = useState<LibraryCounts>({ movies: 0, tv: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Partner/Friends state
  const [partner, setPartner] = useState<Partner | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sharingLoading, setSharingLoading] = useState(true);

  // Modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCounts();
      fetchSharingData();
    }
  }, [status]);

  const fetchCounts = async () => {
    try {
      const [watchingRes, watchlistRes, finishedRes] = await Promise.all([
        fetch('/api/watching'),
        fetch('/api/watchlist'),
        fetch('/api/watched'),
      ]);

      const parseRes = async (res: Response) => {
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      };

      const watching = await parseRes(watchingRes);
      const watchlist = await parseRes(watchlistRes);
      const finished = await parseRes(finishedRes);

      const allItems = [...watching, ...watchlist, ...finished];
      const movies = allItems.filter((item: any) => item.media_type === 'movie').length;
      const tv = allItems.filter((item: any) => item.media_type === 'tv').length;

      setCounts({ movies, tv, total: movies + tv });
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharingData = async () => {
    try {
      setSharingLoading(true);

      const [partnerRes, friendsRes] = await Promise.all([
        fetch('/api/partners'),
        fetch('/api/friends'),
      ]);

      if (partnerRes.ok) {
        const partnerData = await partnerRes.json();
        setPartner(partnerData.partner || null);

        // Get pending partner invites
        if (!partnerData.partner) {
          const pendingRes = await fetch('/api/partners/pending-invites');
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            const partnerPending = (pendingData.invites || []).map((inv: any) => ({
              ...inv,
              type: 'partner' as const,
            }));
            setPendingInvites(prev => [...prev.filter(p => p.type !== 'partner'), ...partnerPending]);
          }
        }
      }

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData.friends || []);
      }

      // Get pending friend invites
      const friendPendingRes = await fetch('/api/friends/pending-invites');
      if (friendPendingRes.ok) {
        const friendPendingData = await friendPendingRes.json();
        const friendPending = (friendPendingData.invites || []).map((inv: any) => ({
          ...inv,
          type: 'friend' as const,
        }));
        setPendingInvites(prev => [...prev.filter(p => p.type !== 'friend'), ...friendPending]);
      }
    } catch (error) {
      console.error('Failed to fetch sharing data:', error);
    } finally {
      setSharingLoading(false);
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

  const sendPartnerInvite = async () => {
    if (!selectedUser) return;

    setInviteLoading(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/partners/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invite');
        return;
      }

      setInviteSent(true);
      fetchSharingData(); // Refresh to show pending
    } catch (err) {
      setInviteError('Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const sendFriendInvite = async () => {
    if (!selectedUser) return;

    setInviteLoading(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/friends/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invite');
        return;
      }

      setInviteSent(true);
      fetchSharingData(); // Refresh to show pending
    } catch (err) {
      setInviteError('Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvite = async (inviteId: number, type: 'partner' | 'friend') => {
    try {
      const endpoint = type === 'partner'
        ? `/api/partners/pending-invites/${inviteId}`
        : `/api/friends/pending-invites/${inviteId}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (response.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    }
  };

  const removePartner = async () => {
    try {
      const response = await fetch('/api/partners', { method: 'DELETE' });
      if (response.ok) {
        setPartner(null);
      }
    } catch (err) {
      console.error('Failed to remove partner:', err);
    }
  };

  const removeFriend = async (collaboratorId: number) => {
    try {
      const response = await fetch(`/api/friends/${collaboratorId}`, { method: 'DELETE' });
      if (response.ok) {
        setFriends(prev => prev.filter(f => f.collaboratorId !== collaboratorId));
      }
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const resetModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setInviteSent(false);
    setInviteError(null);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const partnerPendingInvites = pendingInvites.filter(inv => inv.type === 'partner');
  const friendPendingInvites = pendingInvites.filter(inv => inv.type === 'friend');

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Profile Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                  {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-sm text-gray-400 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">{counts.movies}</span>
                <span className="text-gray-400"> movies</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">{counts.tv}</span>
                <span className="text-gray-400"> shows</span>
              </span>
            </div>
          </div>
        </div>

        {/* Partner Section */}
        <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h3 className="font-semibold">Partner</h3>
            </div>
            {partner && (
              <Link href="/partner-lists" className="text-xs text-pink-400 hover:text-pink-300">
                View Lists →
              </Link>
            )}
          </div>

          {sharingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : partner ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center overflow-hidden">
                {partner.image ? (
                  <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-pink-500 font-semibold">
                    {partner.name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{partner.name}</p>
                {partner.username && (
                  <p className="text-xs text-gray-500">@{partner.username}</p>
                )}
              </div>
              <button
                onClick={removePartner}
                className="p-2 hover:bg-zinc-800 rounded-lg text-gray-500 hover:text-red-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : partnerPendingInvites.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">Pending invite:</p>
              {partnerPendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg">
                  <span className="text-sm text-gray-300">
                    Invite sent {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => cancelInvite(inv.id, 'partner')}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => {
                resetModal();
                setShowPartnerModal(true);
              }}
              className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-pink-500 rounded-xl text-gray-400 hover:text-white transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Partner
            </button>
          )}
        </div>

        {/* Friends Section */}
        <div className="bg-zinc-900 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Friends</h3>
              {friends.length > 0 && (
                <span className="text-xs text-gray-500">({friends.length})</span>
              )}
            </div>
            <button
              onClick={() => {
                resetModal();
                setShowFriendModal(true);
              }}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
            >
              <UserPlus className="w-4 h-4 text-blue-500" />
            </button>
          </div>

          {sharingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pending friend invites */}
              {friendPendingInvites.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Pending invites:</p>
                  {friendPendingInvites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg mb-1">
                      <span className="text-sm text-gray-300">
                        Invite sent {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => cancelInvite(inv.id, 'friend')}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends list */}
              {friends.length > 0 ? (
                friends.map(friend => (
                  <div key={friend.collaboratorId} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg transition">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                      {friend.image ? (
                        <img src={friend.image} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-500 font-semibold text-sm">
                          {friend.name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{friend.name}</p>
                      {friend.suggestionStats.pending > 0 && (
                        <p className="text-xs text-brand-primary">
                          {friend.suggestionStats.pending} pending suggestions
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFriend(friend.collaboratorId)}
                      className="p-1.5 hover:bg-zinc-700 rounded text-gray-500 hover:text-red-400 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : friendPendingInvites.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  Add friends to send and receive suggestions
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Settings Links */}
        <div className="space-y-2">
          <Link
            href="/settings/notifications"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-gray-400">Manage show alerts</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Settings</h3>
              <p className="text-sm text-gray-400">Privacy, import, export, and more</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <div className="h-px bg-zinc-800 my-4" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 bg-zinc-900 hover:bg-red-900/20 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-red-400">Log Out</h3>
            </div>
          </button>
        </div>
      </main>

      {/* Partner Invite Modal */}
      {showPartnerModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowPartnerModal(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            {!inviteSent ? (
              <>
                <h2 className="text-xl font-bold mb-2">Add Partner</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Search for your partner by username to send them an invite.
                </p>

                {inviteError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {inviteError}
                  </div>
                )}

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      placeholder="Search by name or @username"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  {searchLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}

                  {!searchLoading && searchResults.length > 0 && !selectedUser && (
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
                          <div className="w-8 h-8 bg-pink-500/20 rounded-full flex items-center justify-center">
                            <span className="text-pink-500 font-semibold text-sm">
                              {user.name?.[0]?.toUpperCase()}
                            </span>
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

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && !selectedUser && (
                    <p className="text-center text-gray-500 text-sm py-4">No users found</p>
                  )}
                </div>

                {selectedUser && (
                  <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/50 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                      <span className="text-pink-500 font-semibold">
                        {selectedUser.name?.[0]?.toUpperCase()}
                      </span>
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
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                <button
                  onClick={sendPartnerInvite}
                  disabled={inviteLoading || !selectedUser}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Heart className="w-5 h-5" />
                      Send Partner Invite
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Invite Sent!</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {selectedUser?.name} will see your partner invite in their notifications.
                </p>
                <button
                  onClick={() => setShowPartnerModal(false)}
                  className="w-full py-3 bg-pink-500 hover:bg-pink-600 rounded-xl font-semibold transition"
                >
                  Done
                </button>
              </div>
            )}

            {!inviteSent && (
              <button
                onClick={() => setShowPartnerModal(false)}
                className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Friend Invite Modal */}
      {showFriendModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowFriendModal(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            {!inviteSent ? (
              <>
                <h2 className="text-xl font-bold mb-2">Add Friend</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Search for friends by username to send and receive suggestions.
                </p>

                {inviteError && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {inviteError}
                  </div>
                )}

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      placeholder="Search by name or @username"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {searchLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}

                  {!searchLoading && searchResults.length > 0 && !selectedUser && (
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
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-blue-500 font-semibold text-sm">
                              {user.name?.[0]?.toUpperCase()}
                            </span>
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

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && !selectedUser && (
                    <p className="text-center text-gray-500 text-sm py-4">No users found</p>
                  )}
                </div>

                {selectedUser && (
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-500 font-semibold">
                        {selectedUser.name?.[0]?.toUpperCase()}
                      </span>
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
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                <button
                  onClick={sendFriendInvite}
                  disabled={inviteLoading || !selectedUser}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Send Friend Invite
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Invite Sent!</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {selectedUser?.name} will see your friend invite in their notifications.
                </p>
                <button
                  onClick={() => setShowFriendModal(false)}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition"
                >
                  Done
                </button>
              </div>
            )}

            {!inviteSent && (
              <button
                onClick={() => setShowFriendModal(false)}
                className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
