'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ChevronRight, Bell, Shield, Share2, Upload, Download,
  LogOut, Settings, Film, Tv, Users, UserPlus,
  Search, Loader2, XCircle, X, Check, Trash2, MessageCircle, Camera, MoreVertical
} from 'lucide-react';
import ProfilePageSkeleton from '@/components/skeletons/ProfilePageSkeleton';
import MainHeader from '@/components/ui/MainHeader';
import { StateDisplay } from '@/components/ui';
import { useProfileImage } from '@/hooks/useProfileImage';
import { FriendCard } from '@/components/friends';
import { FriendAcceptanceSheet } from '@/components/sharing';

interface LibraryCounts {
  movies: number;
  tv: number;
  total: number;
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
  type: 'friend' | 'pending-friend';
  targetUser: {
    id: number;
    name: string;
    username: string | null;
    image: string | null;
  } | null;
  createdAt: string;
  expiresAt: string;
}

interface IncomingInvite {
  id: number;
  inviteCode: string;
  createdAt: string;
  expiresAt: string;
  sender: {
    id: number;
    name: string;
    username: string | null;
    image: string | null;
  };
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

  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<IncomingInvite[]>([]);
  const [sharingLoading, setSharingLoading] = useState(true);
  const [acceptingInvite, setAcceptingInvite] = useState<number | null>(null);
  const [decliningInvite, setDecliningInvite] = useState<number | null>(null);

  // Modal state
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

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'friend' | 'pending-friend';
    name: string;
    id: number;
  } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Friend acceptance flow state (for showing list sharing options)
  const [pendingFriendAccept, setPendingFriendAccept] = useState<{
    inviteId: number;
    friend: {
      id: number;
      name: string;
      username: string | null;
      image: string | null;
    };
  } | null>(null);

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

      const friendsRes = await fetch('/api/friends');
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData.friends || []);
      }

      // Get pending friend invites (outgoing)
      const friendPendingRes = await fetch('/api/friends/pending-invites');
      if (friendPendingRes.ok) {
        const friendPendingData = await friendPendingRes.json();
        const friendPending = (friendPendingData.invites || []).map((inv: any) => ({
          ...inv,
          type: 'friend' as const,
        }));
        setPendingInvites(friendPending);
      }

      // Get incoming friend invites (requests from others)
      const incomingRes = await fetch('/api/friends/incoming-invites');
      if (incomingRes.ok) {
        const incomingData = await incomingRes.json();
        setIncomingInvites(incomingData.invites || []);
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

  const cancelInvite = async (inviteId: number) => {
    try {
      const response = await fetch(`/api/friends/pending-invites/${inviteId}`, { method: 'DELETE' });

      if (response.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    }
  };

  const acceptIncomingInvite = (inviteId: number) => {
    // Find the invite to get sender info
    const invite = incomingInvites.find(inv => inv.id === inviteId);
    if (!invite) return;

    // Show the FriendAcceptanceSheet for list sharing options
    setPendingFriendAccept({
      inviteId: invite.id,
      friend: {
        id: invite.sender.id,
        name: invite.sender.name,
        username: invite.sender.username,
        image: invite.sender.image,
      },
    });
  };

  const handleFriendAccepted = () => {
    if (pendingFriendAccept) {
      // Remove from incoming invites list
      setIncomingInvites(prev => prev.filter(inv => inv.id !== pendingFriendAccept.inviteId));
    }
    setPendingFriendAccept(null);

    // Dispatch event to notify other components (like notification center)
    window.dispatchEvent(new CustomEvent('connection-accepted'));

    // Refresh friends list
    fetchSharingData();
  };

  const declineIncomingInvite = async (inviteId: number) => {
    setDecliningInvite(inviteId);
    try {
      const response = await fetch(`/api/friends/incoming-invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIncomingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to decline invite:', err);
    } finally {
      setDecliningInvite(null);
    }
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

    const idToRemove = confirmModal.id;
    setRemoveLoading(true);
    try {
      if (confirmModal.type === 'pending-friend') {
        // Cancel pending friend invite
        await cancelInvite(idToRemove);
      } else {
        const response = await fetch(`/api/friends/${idToRemove}`, { method: 'DELETE' });
        if (response.ok) {
          // Remove from friends list immediately
          setFriends(prev => prev.filter(f => f.id !== idToRemove));
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to remove friend:', errorData);
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

  const friendPendingInvites = pendingInvites.filter(inv => inv.type === 'friend' || inv.type === 'pending-friend');

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
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-brand-primary rounded-full flex items-center justify-center border-2" style={{ borderColor: 'var(--card-bg)' }}>
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
            <Link href="/library/manage?type=movie" className="flex items-center gap-2 hover:opacity-80 transition">
              <Film className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">{counts.movies}</span>
                <span className="text-gray-400"> movies</span>
              </span>
            </Link>
            <Link href="/library/manage?type=tv" className="flex items-center gap-2 hover:opacity-80 transition">
              <Tv className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">{counts.tv}</span>
                <span className="text-gray-400"> shows</span>
              </span>
            </Link>
          </div>
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


          {sharingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Incoming friend requests */}
              {incomingInvites.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Friend Requests</p>
                  {incomingInvites.map(inv => {
                    const sentDate = new Date(inv.createdAt);
                    const dateStr = `${(sentDate.getMonth() + 1).toString().padStart(2, '0')}/${sentDate.getDate().toString().padStart(2, '0')}/${sentDate.getFullYear().toString().slice(-2)}`;
                    const isAccepting = acceptingInvite === inv.id;
                    const isDeclining = decliningInvite === inv.id;

                    return (
                      <div key={inv.id} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                            {inv.sender.image ? (
                              <img
                                src={inv.sender.image}
                                alt={inv.sender.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-semibold">
                                {inv.sender.name?.[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{inv.sender.name}</p>
                            <p className="text-xs text-gray-400">
                              {inv.sender.username && <span>@{inv.sender.username} · </span>}
                              Sent {dateStr}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => acceptIncomingInvite(inv.id)}
                            disabled={isAccepting || isDeclining}
                            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5"
                          >
                            {isAccepting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Accept
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => declineIncomingInvite(inv.id)}
                            disabled={isAccepting || isDeclining}
                            className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 text-gray-300"
                          >
                            {isDeclining ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <X className="w-4 h-4" />
                                Decline
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pending outgoing friend invites */}
              {friendPendingInvites.length > 0 && (
                <div className="mb-3 space-y-2">
                  {friendPendingInvites.map(inv => {
                    const sentDate = new Date(inv.createdAt);
                    const dateStr = `${(sentDate.getMonth() + 1).toString().padStart(2, '0')}/${sentDate.getDate().toString().padStart(2, '0')}/${sentDate.getFullYear().toString().slice(-2)}`;

                    return (
                      <div key={inv.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl relative">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                          {inv.targetUser?.image ? (
                            <img src={inv.targetUser.image} alt="" className="w-full h-full object-cover" />
                          ) : inv.targetUser ? (
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
                            <span className="text-amber-500">Pending</span> · Sent {dateStr}
                          </p>
                        </div>

                        {/* 3-dot menu for consistency */}
                        <div className="relative">
                          <button
                            onClick={() => setConfirmModal({
                              show: true,
                              type: 'pending-friend',
                              name: inv.targetUser?.name || 'this invite',
                              id: inv.id,
                            })}
                            className="p-1.5 hover:bg-zinc-700 rounded-lg transition text-gray-400 hover:text-white"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Friends list - using FriendCard components */}
              {friends.length > 0 && (
                <div className="space-y-3">
                  {friends.map(friend => (
                    <FriendCard
                      key={friend.id || friend.collaboratorId}
                      friend={{
                        id: friend.id || friend.collaboratorId || 0,
                        user_id: friend.user_id || 0,
                        name: friend.name,
                        username: friend.username,
                        image: friend.image,
                        connected_at: friend.connected_at || friend.connectedAt || new Date().toISOString(),
                      }}
                      onRemove={(collaboratorId, friendName) => {
                        setConfirmModal({
                          show: true,
                          type: 'friend',
                          name: friendName,
                          id: collaboratorId,
                        });
                      }}
                    />
                  ))}
                </div>
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
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                            {user.image ? (
                              <img src={user.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold text-sm">
                                {user.name?.[0]?.toUpperCase()}
                              </span>
                            )}
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
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                      {selectedUser.image ? (
                        <img src={selectedUser.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold">
                          {selectedUser.name?.[0]?.toUpperCase()}
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
              <StateDisplay
                icon={Check}
                variant="success"
                title="Invite Sent!"
                message={`${selectedUser?.name} will see your friend invite in their notifications.`}
                buttonText="Done"
                onButtonClick={() => setShowFriendModal(false)}
              />
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
                {confirmModal.type === 'pending-friend' ? 'Cancel Invite?' : 'Remove Friend?'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {confirmModal.type === 'pending-friend' ? (
                  <>Are you sure you want to cancel the friend invite to <strong className="text-white">{confirmModal.name}</strong>?</>
                ) : (
                  <>Are you sure you want to remove <strong className="text-white">{confirmModal.name}</strong> as your friend? Shared lists and collaborative lists with them will be removed.</>
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
                  ) : confirmModal.type === 'pending-friend' ? (
                    'Cancel Invite'
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

      {/* Friend Acceptance Sheet (list sharing options when accepting) */}
      {pendingFriendAccept && (
        <FriendAcceptanceSheet
          isOpen={true}
          onClose={() => setPendingFriendAccept(null)}
          friend={pendingFriendAccept.friend}
          inviteId={pendingFriendAccept.inviteId}
          onAccepted={handleFriendAccepted}
        />
      )}
    </div>
  );
}
