'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ChevronRight, Bell, Shield, Share2, Upload, Download,
  LogOut, Settings, Film, Tv, Heart, Users, UserPlus,
  Search, Loader2, XCircle, X, Check, Trash2, MessageCircle, Camera, Info
} from 'lucide-react';
import ProfilePageSkeleton from '@/components/skeletons/ProfilePageSkeleton';
import MainHeader from '@/components/ui/MainHeader';
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
  // API returns these names
  id?: number;
  user_id?: number;
  connected_at?: string;
  suggestions_sent?: number;
  suggestions_received?: number;
  // Also support mapped names for backwards compatibility
  collaboratorId?: number;
  oduserId?: number;
  connectedAt?: string;
  // Common fields
  name: string;
  username: string | null;
  image: string | null;
  suggestionStats?: {
    sent: number;
    received: number;
    pending: number;
  };
}

interface PendingInvite {
  id: number;
  type: 'partner' | 'friend';
  targetUser: {
    id: number;
    name: string;
    username: string | null;
  } | null;
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
  const [username, setUsername] = useState<string | null>(null);

  // Partner/Friends state
  const [partner, setPartner] = useState<Partner | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sharingLoading, setSharingLoading] = useState(true);

  // Modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showPartnerInfo, setShowPartnerInfo] = useState(false);
  const [showFriendInfo, setShowFriendInfo] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'partner' | 'friend';
    name: string;
    id: number;
  } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for connection-accepted events from notification center
  useEffect(() => {
    const handleConnectionAccepted = () => {
      fetchSharingData();
    };

    window.addEventListener('connection-accepted', handleConnectionAccepted);
    return () => {
      window.removeEventListener('connection-accepted', handleConnectionAccepted);
    };
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
      fetchUsername();
    }
  }, [status]);

  const fetchUsername = async () => {
    try {
      const res = await fetch('/api/users/username');
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username || null);
      }
    } catch (error) {
      console.error('Failed to fetch username:', error);
    }
  };

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

  const showRemovePartnerConfirm = () => {
    if (!partner) return;
    setConfirmModal({
      show: true,
      type: 'partner',
      name: partner.name,
      id: 0, // Not needed for partner
    });
  };

  const showRemoveFriendConfirm = (friend: Friend) => {
    setConfirmModal({
      show: true,
      type: 'friend',
      name: friend.name,
      id: friend.id || friend.collaboratorId || 0,
    });
  };

  const confirmRemove = async () => {
    if (!confirmModal) return;

    setRemoveLoading(true);
    try {
      if (confirmModal.type === 'partner') {
        const response = await fetch('/api/partners', { method: 'DELETE' });
        if (response.ok) {
          setPartner(null);
        }
      } else {
        const response = await fetch(`/api/friends/${confirmModal.id}`, { method: 'DELETE' });
        if (response.ok) {
          setFriends(prev => prev.filter(f => (f.id || f.collaboratorId) !== confirmModal.id));
        }
      }
    } catch (err) {
      console.error('Failed to remove connection:', err);
    } finally {
      setRemoveLoading(false);
      setConfirmModal(null);
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
    setLogoutLoading(true);
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return <ProfilePageSkeleton />;
  }

  const partnerPendingInvites = pendingInvites.filter(inv => inv.type === 'partner');
  const friendPendingInvites = pendingInvites.filter(inv => inv.type === 'friend');

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <MainHeader title="Profile" />

      <main className="px-4">
        {/* Profile Card */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/settings/privacy"
              className="relative w-20 h-20 flex-shrink-0"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {profileImage ? (
                  <img src={profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                    {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-brand-primary rounded-full flex items-center justify-center border-2 border-black">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">
                {session?.user?.name || 'User'}
              </h2>
              {username && (
                <p className="text-sm text-gray-400 truncate">
                  @{username}
                </p>
              )}
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
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
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

          <p className="text-xs text-gray-400 mb-3 flex items-start gap-1">
            <span>Create shared watchlists with your partner—both of you can add and see the same items.</span>
            <button
              onClick={() => setShowPartnerInfo(!showPartnerInfo)}
              className="text-gray-400 hover:text-gray-300 transition flex-shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </p>

          {showPartnerInfo && (
            <div className="mb-3 p-3 bg-zinc-800 rounded-lg text-xs text-gray-300 space-y-2">
              <p><strong className="text-white">Bi-directional sharing:</strong> Both you and your partner see the same shared lists. Items either of you add appear for both.</p>
              <p><strong className="text-white">Watch together tracking:</strong> Mark movies as "watched together" to track your shared viewing history.</p>
              <p><strong className="text-white">One partner limit:</strong> You can only have one partner at a time to keep lists focused.</p>
            </div>
          )}

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
                  <span className="text-white font-semibold">
                    {partner.name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{partner.name}</p>
                {partner.username && (
                  <p className="text-xs text-gray-400">@{partner.username}</p>
                )}
              </div>
              <button
                onClick={showRemovePartnerConfirm}
                className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-red-400 transition"
                title="Remove partner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : partnerPendingInvites.length > 0 ? (
            <div className="space-y-2">
              {partnerPendingInvites.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                    {inv.targetUser ? (
                      <span className="text-white font-semibold">
                        {inv.targetUser.name?.[0]?.toUpperCase()}
                      </span>
                    ) : (
                      <UserPlus className="w-5 h-5 text-pink-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {inv.targetUser ? inv.targetUser.name : 'Invite link created'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Pending · Sent {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelInvite(inv.id, 'partner')}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-lg transition"
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
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Friends</h3>
              {friends.length > 0 && (
                <span className="text-xs text-gray-400">({friends.length})</span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3 flex items-start gap-1">
            <span>Send recommendations to friends—they can accept to add them to their own lists.</span>
            <button
              onClick={() => setShowFriendInfo(!showFriendInfo)}
              className="text-gray-400 hover:text-gray-300 transition flex-shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </p>

          {showFriendInfo && (
            <div className="mb-3 p-3 bg-zinc-800 rounded-lg text-xs text-gray-300 space-y-2">
              <p><strong className="text-white">One-way suggestions:</strong> Send movie recommendations to friends. They choose to add them or dismiss.</p>
              <p><strong className="text-white">No shared lists:</strong> Unlike partners, friends have separate libraries. Suggestions are just recommendations.</p>
              <p><strong className="text-white">Unlimited friends:</strong> Connect with as many friends as you like.</p>
            </div>
          )}

          {sharingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pending friend invites */}
              {friendPendingInvites.length > 0 && (
                <div className="mb-3">
                  {friendPendingInvites.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        {inv.targetUser ? (
                          <span className="text-white font-semibold">
                            {inv.targetUser.name?.[0]?.toUpperCase()}
                          </span>
                        ) : (
                          <UserPlus className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {inv.targetUser ? inv.targetUser.name : 'Invite link created'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Pending · Sent {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => cancelInvite(inv.id, 'friend')}
                        className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends list */}
              {friends.length > 0 && (
                friends.map(friend => (
                  <div key={friend.id || friend.collaboratorId} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg transition">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                      {friend.image ? (
                        <img src={friend.image} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {friend.name?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{friend.name}</p>
                      {(friend.suggestionStats?.pending ?? 0) > 0 && (
                        <p className="text-xs text-brand-primary">
                          {friend.suggestionStats?.pending} pending suggestions
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => showRemoveFriendConfirm(friend)}
                      className="p-1.5 hover:bg-zinc-700 rounded text-gray-400 hover:text-red-400 transition"
                      title="Remove friend"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}

              {/* Add Friend button */}
              <button
                onClick={() => {
                  resetModal();
                  setShowFriendModal(true);
                }}
                className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-xl text-gray-400 hover:text-white transition flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Friend
              </button>
            </div>
          )}
        </div>

        {/* Settings Links */}
        <div className="space-y-2">
          <Link
            href="/settings/notifications"
            className="card card-interactive flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-gray-400">Manage show alerts</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/settings"
            className="card card-interactive flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Settings</h3>
              <p className="text-sm text-gray-400">Privacy, import, export, and more</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="card card-interactive w-full flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white">Log Out</h3>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                              <p className="text-xs text-gray-400">@{user.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && !selectedUser && (
                    <p className="text-center text-gray-400 text-sm py-4">No users found</p>
                  )}
                </div>

                {selectedUser && (
                  <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/50 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
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
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
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
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark rounded-xl font-semibold transition"
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                              <p className="text-xs text-gray-400">@{user.username}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && !selectedUser && (
                    <p className="text-center text-gray-400 text-sm py-4">No users found</p>
                  )}
                </div>

                {selectedUser && (
                  <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
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
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
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
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-dark rounded-xl font-semibold transition"
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

      {/* Remove Confirmation Modal */}
      {confirmModal?.show && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !removeLoading && setConfirmModal(null)}
          />

          <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Remove {confirmModal.type === 'partner' ? 'Partner' : 'Friend'}?
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to remove <strong className="text-white">{confirmModal.name}</strong> as your {confirmModal.type}?
                {confirmModal.type === 'partner' && (
                  <span className="block mt-2 text-xs">Your shared lists will no longer be synced.</span>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  disabled={removeLoading}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemove}
                  disabled={removeLoading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {removeLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !logoutLoading && setShowLogoutModal(false)}
          />

          <div className="relative w-full max-w-sm bg-zinc-900 rounded-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Log Out?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to log out of your account?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={logoutLoading}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary-dark rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {logoutLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Log Out'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
