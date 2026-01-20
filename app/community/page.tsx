'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  Loader2,
  Check,
  UserPlus,
  MessageCircle,
  Trophy,
  Bell,
  Copy,
  ExternalLink,
  Lightbulb,
  X,
  Send,
  Clock,
} from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';

interface UserSearchResult {
  id: number;
  name: string;
  username: string | null;
  isConnection: boolean;
  hasPendingInvite?: boolean;
}

interface Connection {
  id: number;
  name: string;
  username: string | null;
  sharedListCount: number;
  connectedAt: string;
}

export default function CommunityPage() {
  const { status } = useSession();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copiedUserId, setCopiedUserId] = useState<number | null>(null);
  const [creatingInvite, setCreatingInvite] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [usernameLoaded, setUsernameLoaded] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [sendingDirectInvite, setSendingDirectInvite] = useState<number | null>(null);
  const [sentInviteUserId, setSentInviteUserId] = useState<number | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConnections();
      fetchUsername();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchUsername = async () => {
    try {
      const response = await fetch('/api/users/username');
      if (response.ok) {
        const data = await response.json();
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Failed to fetch username:', error);
    } finally {
      setUsernameLoaded(true);
    }
  };

  const fetchConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const createInviteForUser = async (userId: number) => {
    setCreatingInvite(userId);
    try {
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: ['watchlist', 'watching', 'finished'] }),
      });

      if (response.ok) {
        const data = await response.json();
        setInviteUrl(data.inviteUrl);

        // Copy to clipboard
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopiedUserId(userId);
        setTimeout(() => setCopiedUserId(null), 3000);
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
    } finally {
      setCreatingInvite(null);
    }
  };

  const sendDirectInvite = async (user: UserSearchResult) => {
    if (!user.username) return;

    setSendingDirectInvite(user.id);
    try {
      const response = await fetch('/api/collaborators/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          lists: ['watchlist', 'watching', 'finished'],
        }),
      });

      if (response.ok) {
        setSentInviteUserId(user.id);
        // Update the search results to show pending status
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, hasPendingInvite: true } : u
          )
        );
        setTimeout(() => setSentInviteUserId(null), 3000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Failed to send direct invite:', error);
    } finally {
      setSendingDirectInvite(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin-fast text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProfileMenu />
            <h1 className="text-2xl font-bold">Community</h1>
          </div>
          <button className="p-2 hover:bg-zinc-800 rounded-full transition relative">
            <Bell className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">
        {/* Find Friends Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-primary" />
            Find Friends
          </h2>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by @username or name..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin-fast text-gray-400" />
            )}
          </div>

          {/* Username Nudge */}
          {usernameLoaded && !username && !nudgeDismissed && (
            <div className="mb-4 bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white mb-2">
                  Set a username so friends can find you too
                </p>
                <Link
                  href="/settings/privacy"
                  className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary-light font-medium"
                >
                  Set username
                </Link>
              </div>
              <button
                onClick={() => setNudgeDismissed(true)}
                className="text-gray-400 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              {searchResults.length === 0 && !isSearching && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center text-gray-400">
                  No users found matching "{searchQuery}"
                </div>
              )}

              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary font-semibold">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {user.username && (
                          <span className="text-gray-400">@{user.username}</span>
                        )}
                        <span className="text-white font-medium">{user.name}</span>
                      </div>
                    </div>
                  </div>

                  {user.isConnection ? (
                    <span className="flex items-center gap-1 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
                      <Check className="w-4 h-4" />
                      Connected
                    </span>
                  ) : user.hasPendingInvite || sentInviteUserId === user.id ? (
                    <span className="flex items-center gap-1 text-sm text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-full">
                      <Clock className="w-4 h-4" />
                      Invite Sent
                    </span>
                  ) : copiedUserId === user.id ? (
                    <span className="flex items-center gap-1 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
                      <Check className="w-4 h-4" />
                      Link Copied!
                    </span>
                  ) : user.username ? (
                    // User has a username - can send direct invite
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendDirectInvite(user)}
                        disabled={sendingDirectInvite === user.id}
                        className="flex items-center gap-1 text-sm bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 px-3 py-1.5 rounded-full transition"
                      >
                        {sendingDirectInvite === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin-fast text-gray-400" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Invite
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    // User has no username - can only use invite link
                    <button
                      onClick={() => createInviteForUser(user.id)}
                      disabled={creatingInvite === user.id}
                      className="flex items-center gap-1 text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 px-3 py-1.5 rounded-full transition"
                    >
                      {creatingInvite === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin-fast text-gray-400" />
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Get Link
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Search Tips */}
          {searchQuery.length === 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-sm text-gray-400">
              Search for other users by their username or name to connect and share lists together.
            </div>
          )}
        </section>

        {/* Your Connections Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary" />
            Your Connections
            {!isLoadingConnections && connections.length > 0 && (
              <span className="text-sm font-normal text-gray-400">({connections.length})</span>
            )}
          </h2>

          {isLoadingConnections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin-fast text-gray-400" />
            </div>
          ) : connections.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No connections yet</p>
              <p className="text-sm text-gray-500">
                Search for users above or share your invite link to connect with friends.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary font-semibold">
                      {getInitials(connection.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {connection.username && (
                          <span className="text-gray-400">@{connection.username}</span>
                        )}
                        <span className="text-white font-medium">{connection.name}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {connection.sharedListCount} shared {connection.sharedListCount === 1 ? 'list' : 'lists'}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/settings/collaborators"
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-zinc-800 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Coming Soon Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-500">Coming Soon</h2>
          <div className="space-y-3 opacity-60">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Activity Feed</h3>
                <p className="text-sm text-gray-400">
                  Stay updated with what your connections are watching.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Watch Challenges</h3>
                <p className="text-sm text-gray-400">
                  Join community challenges and compete with friends.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Leaderboards</h3>
                <p className="text-sm text-gray-400">
                  Compare your watch stats with friends and the community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Invite URL Display (when created) */}
        {inviteUrl && (
          <div className="fixed bottom-20 left-4 right-4 bg-zinc-900 border border-brand-primary rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-brand-primary">Invite Link Created</span>
              <button
                onClick={() => setInviteUrl(null)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <p className="text-sm text-gray-300 break-all">{inviteUrl}</p>
            <p className="text-xs text-gray-500 mt-2">
              Share this link with the user to connect. Link expires in 7 days.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
