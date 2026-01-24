'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Trash2,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
  Play,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Heart,
  RotateCcw,
  Sparkles,
  Share2,
  Settings,
  Link2,
  Search,
  AtSign,
  Plus,
  X,
} from 'lucide-react';
import { StateDisplay } from '@/components/ui';

interface Collaboration {
  collaboration: {
    id: number;
    owner_id: number;
    collaborator_id: number;
    owner_name: string;
    collaborator_name: string;
    accepted_at: string;
  };
  sharedLists: string[];
  isOwner: boolean;
}

interface PendingInvite {
  id: number;
  inviteCode: string;
  inviteUrl: string;
  sharedLists: string[];
  createdAt: string;
  expiresAt: string;
}

interface CustomList {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  item_count?: number;
}

const listIcons: Record<string, React.ReactNode> = {
  watchlist: <Clock className="w-4 h-4 text-blue-500" />,
  watching: <Play className="w-4 h-4 text-green-500" />,
  finished: <CheckCircle2 className="w-4 h-4 text-brand-primary" />,
  onhold: <PauseCircle className="w-4 h-4 text-yellow-500" />,
  dropped: <XCircle className="w-4 h-4 text-red-500" />,
  favorites: <Heart className="w-4 h-4 text-pink-500" />,
  rewatch: <RotateCcw className="w-4 h-4 text-cyan-500" />,
  nostalgia: <Sparkles className="w-4 h-4 text-amber-500" />,
};

const listLabels: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  finished: 'Watched',
  onhold: 'On Hold',
  dropped: 'Dropped',
  favorites: 'Favorites',
  rewatch: 'Rewatch',
  nostalgia: 'Classics',
};

export default function CollaboratorsSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTab, setInviteTab] = useState<'search' | 'link'>('search');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; username: string | null; image: string | null }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; username: string | null } | null>(null);
  const [directInviteSent, setDirectInviteSent] = useState(false);
  const [selectedCustomLists, setSelectedCustomLists] = useState<number[]>([]);

  // Inline list creation state
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingListLoading, setCreatingListLoading] = useState(false);

  // Remove confirmation
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<number | null>(null);

  // Edit shared lists modal
  const [editingCollaboration, setEditingCollaboration] = useState<Collaboration | null>(null);
  const [editLists, setEditLists] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Portal mount state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCollaborations();
      fetchPendingInvites();
      fetchCustomLists();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const fetchCollaborations = async () => {
    try {
      const response = await fetch('/api/collaborators');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load collaborations');
        return;
      }

      setCollaborations(data.collaborations || []);
    } catch (err) {
      setError('Failed to load collaborations');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const response = await fetch('/api/collaborators/pending-invites');
      const data = await response.json();

      if (response.ok) {
        setPendingInvites(data.invites || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending invites:', err);
    }
  };

  const fetchCustomLists = async () => {
    try {
      const response = await fetch('/api/custom-lists');
      const data = await response.json();

      if (response.ok) {
        setCustomLists(data.lists || []);
      }
    } catch (err) {
      console.error('Failed to fetch custom lists:', err);
    }
  };

  const revokeInvite = async (inviteId: number) => {
    setRevokingInviteId(inviteId);
    try {
      const response = await fetch(`/api/collaborators/pending-invites/${inviteId}`, {
        method: 'DELETE',
      });

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

  const createInvite = async () => {
    setInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: selectedLists }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create invite');
        return;
      }

      setInviteUrl(data.inviteUrl);
      // Refresh pending invites list
      fetchPendingInvites();
    } catch (err) {
      setError('Failed to create invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const removeCollaboration = async (id: number) => {
    try {
      const response = await fetch(`/api/collaborators/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to remove collaboration');
        return;
      }

      setCollaborations(prev => prev.filter(c => c.collaboration.id !== id));
      setRemovingId(null);
    } catch (err) {
      setError('Failed to remove collaboration');
    }
  };

  const toggleListSelection = (listType: string) => {
    setSelectedLists(prev =>
      prev.includes(listType)
        ? prev.filter(l => l !== listType)
        : [...prev, listType]
    );
  };

  const toggleCustomListSelection = (listId: number) => {
    setSelectedCustomLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const createNewList = async () => {
    const trimmedName = newListName.trim();
    if (!trimmedName || creatingListLoading) return;

    setCreatingListLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/custom-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          icon: 'list',
          color: 'purple',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create list');
        return;
      }

      // Add the new list to customLists and auto-select it
      const newList: CustomList = {
        id: data.list.id,
        slug: data.list.slug,
        name: data.list.name,
        icon: data.list.icon,
        color: data.list.color,
        item_count: 0,
      };
      setCustomLists(prev => [...prev, newList]);
      setSelectedCustomLists(prev => [...prev, newList.id]);

      // Reset the form
      setNewListName('');
      setIsCreatingList(false);
    } catch (err) {
      setError('Failed to create list');
    } finally {
      setCreatingListLoading(false);
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

  const sendDirectInvite = async () => {
    if (!selectedUser || (selectedLists.length === 0 && selectedCustomLists.length === 0)) return;

    setInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/collaborators/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          lists: selectedLists,
          customListIds: selectedCustomLists,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invite');
        return;
      }

      setDirectInviteSent(true);
    } catch (err) {
      setError('Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const openEditModal = (collab: Collaboration) => {
    setEditingCollaboration(collab);
    setEditLists(collab.sharedLists);
  };

  const toggleEditList = (listType: string) => {
    setEditLists(prev =>
      prev.includes(listType)
        ? prev.filter(l => l !== listType)
        : [...prev, listType]
    );
  };

  const saveEditedLists = async () => {
    if (!editingCollaboration || editLists.length === 0) {
      setError('Please select at least one list to share');
      return;
    }

    setEditLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collaborators/${editingCollaboration.collaboration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: editLists }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update shared lists');
        return;
      }

      // Update local state
      setCollaborations(prev =>
        prev.map(c =>
          c.collaboration.id === editingCollaboration.collaboration.id
            ? { ...c, sharedLists: editLists }
            : c
        )
      );
      setEditingCollaboration(null);
    } catch (err) {
      setError('Failed to update shared lists');
    } finally {
      setEditLoading(false);
    }
  };

  if (status === 'loading' || loading) {
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
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Connections</h1>
            <p className="text-xs text-gray-400">Share lists with friends</p>
          </div>
        </div>
      </header>

      <main className="px-4">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Pending Invites ({pendingInvites.length})
            </h2>
            <div className="space-y-3">
              {pendingInvites.map((invite) => {
                const expiresAt = new Date(invite.expiresAt);
                const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={invite.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">Invite Link</h3>
                          <p className="text-xs text-gray-500">
                            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => revokeInvite(invite.id)}
                        disabled={revokingInviteId === invite.id}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400 disabled:opacity-50"
                        title="Revoke invite"
                      >
                        {revokingInviteId === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Shared lists */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {invite.sharedLists.map(listType => (
                        <span
                          key={listType}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 rounded-lg text-xs"
                        >
                          {listIcons[listType]}
                          {listLabels[listType]}
                        </span>
                      ))}
                    </div>

                    {/* Copy link button */}
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(invite.inviteUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invite to Collaborate Button - always visible */}
        <button
          onClick={() => {
            setShowInviteModal(true);
            setInviteUrl(null);
            setSelectedLists([]);
            setSelectedCustomLists([]);
            setSelectedUser(null);
            setSearchQuery('');
            setSearchResults([]);
            setDirectInviteSent(false);
            setInviteTab('search');
            setIsCreatingList(false);
            setNewListName('');
          }}
          className="w-full mb-6 p-4 border-2 border-dashed border-zinc-700 hover:border-brand-primary rounded-xl transition flex items-center justify-center gap-3 text-gray-400 hover:text-white group"
        >
          <UserPlus className="w-5 h-5 group-hover:text-brand-primary transition" />
          <span className="font-medium">Invite to Collaborate</span>
        </button>

        {/* Empty state */}
        {collaborations.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No connections yet</h2>
            <p className="text-gray-400 max-w-xs mx-auto">
              Invite friends to share your movie and TV show lists together.
            </p>
          </div>
        )}

        {/* Collaborations list */}
        {collaborations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Your Collaborators
            </h2>

            {collaborations.map(({ collaboration, sharedLists, isOwner }) => {
              const partnerName = isOwner
                ? collaboration.collaborator_name
                : collaboration.owner_name;

              return (
                <div
                  key={collaboration.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-brand-primary font-semibold">
                          {partnerName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{partnerName}</h3>
                        <p className="text-xs text-gray-500">
                          Connected {new Date(collaboration.accepted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {removingId !== collaboration.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal({ collaboration, sharedLists, isOwner })}
                          className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-brand-primary"
                          title="Edit shared lists"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRemovingId(collaboration.id)}
                          className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-red-400"
                          title="Stop sharing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Shared lists */}
                  <div className="flex flex-wrap gap-2">
                    {sharedLists.map(listType => (
                      <span
                        key={listType}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 rounded-lg text-xs"
                      >
                        {listIcons[listType]}
                        {listLabels[listType]}
                      </span>
                    ))}
                  </div>

                  {/* Remove confirmation */}
                  {removingId === collaboration.id && (
                    <div className="mt-4 pt-4 border-t border-zinc-700">
                      <p className="text-sm text-gray-300 mb-3">
                        End connection with {partnerName}?
                      </p>
                      <ul className="text-xs text-gray-500 mb-4 space-y-1">
                        <li>• You'll no longer see each other's items</li>
                        <li>• Items already in your library stay yours</li>
                        <li>• {partnerName} will be notified</li>
                      </ul>
                      <div className="flex gap-2">
                        <button
                          onClick={() => removeCollaboration(collaboration.id)}
                          className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition"
                        >
                          End Connection
                        </button>
                        <button
                          onClick={() => setRemovingId(null)}
                          className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowInviteModal(false)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Invite to Collaborate</h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setInviteTab('search')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  inviteTab === 'search'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                Find User
              </button>
              <button
                onClick={() => setInviteTab('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                  inviteTab === 'link'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:text-white'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Share Link
              </button>
            </div>

            {/* Search User Tab */}
            {inviteTab === 'search' && !directInviteSent && (
              <>
                {/* User search */}
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
                      className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary lowercase"
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
                          <div className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-brand-primary font-semibold text-sm">
                              {user.name?.charAt(0).toUpperCase()}
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

                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">No users found</p>
                  )}
                </div>

                {/* Selected user */}
                {selectedUser && (
                  <div className="mb-4 p-3 bg-brand-primary/10 border border-brand-primary rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-primary font-semibold">
                        {selectedUser.name?.charAt(0).toUpperCase()}
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
                      <XCircle className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}

                {/* System Lists selection */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-3">System Lists</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(listLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => toggleListSelection(key)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition ${
                          selectedLists.includes(key)
                            ? 'bg-brand-primary/10 border-brand-primary'
                            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedLists.includes(key)
                            ? 'bg-brand-primary border-brand-primary'
                            : 'border-zinc-600'
                        }`}>
                          {selectedLists.includes(key) && <Check className="w-3 h-3" />}
                        </div>
                        {listIcons[key]}
                        <span className="flex-1 text-left">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Lists selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">Custom Lists</h3>
                  <div className="space-y-2">
                    {customLists.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {customLists.map((list) => (
                          <button
                            key={list.id}
                            onClick={() => toggleCustomListSelection(list.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition ${
                              selectedCustomLists.includes(list.id)
                                ? 'bg-brand-primary/10 border-brand-primary'
                                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selectedCustomLists.includes(list.id)
                                ? 'bg-brand-primary border-brand-primary'
                                : 'border-zinc-600'
                            }`}>
                              {selectedCustomLists.includes(list.id) && <Check className="w-3 h-3" />}
                            </div>
                            <span className="flex-1 text-left truncate">{list.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inline create list */}
                    {isCreatingList ? (
                      <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700">
                        <input
                          type="text"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') createNewList();
                            if (e.key === 'Escape') {
                              setIsCreatingList(false);
                              setNewListName('');
                            }
                          }}
                          placeholder="List name..."
                          autoFocus
                          className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-500"
                          maxLength={50}
                        />
                        <button
                          onClick={createNewList}
                          disabled={!newListName.trim() || creatingListLoading}
                          className="p-1 text-green-500 hover:text-green-400 disabled:text-gray-600 disabled:cursor-not-allowed"
                        >
                          {creatingListLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingList(false);
                            setNewListName('');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreatingList(true)}
                        className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-zinc-600 text-sm text-gray-400 hover:text-white hover:border-zinc-500 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create new list...</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={sendDirectInvite}
                  disabled={inviteLoading || !selectedUser || (selectedLists.length === 0 && selectedCustomLists.length === 0)}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Send Invite
                    </>
                  )}
                </button>
              </>
            )}

            {/* Direct invite sent success */}
            {inviteTab === 'search' && directInviteSent && (
              <StateDisplay
                icon={Check}
                variant="success"
                title="Invite Sent!"
                message={`${selectedUser?.name} will see your invitation in their notifications.`}
                buttonText="Done"
                onButtonClick={() => setShowInviteModal(false)}
              />
            )}

            {/* Share Link Tab */}
            {inviteTab === 'link' && !inviteUrl && (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  Create a link to share with anyone. They can accept using this link.
                </p>

                {/* System Lists selection */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-3">System Lists</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(listLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => toggleListSelection(key)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition ${
                          selectedLists.includes(key)
                            ? 'bg-brand-primary/10 border-brand-primary'
                            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedLists.includes(key)
                            ? 'bg-brand-primary border-brand-primary'
                            : 'border-zinc-600'
                        }`}>
                          {selectedLists.includes(key) && <Check className="w-3 h-3" />}
                        </div>
                        {listIcons[key]}
                        <span className="flex-1 text-left">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Lists selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">Custom Lists</h3>
                  <div className="space-y-2">
                    {customLists.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {customLists.map((list) => (
                          <button
                            key={list.id}
                            onClick={() => toggleCustomListSelection(list.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition ${
                              selectedCustomLists.includes(list.id)
                                ? 'bg-brand-primary/10 border-brand-primary'
                                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selectedCustomLists.includes(list.id)
                                ? 'bg-brand-primary border-brand-primary'
                                : 'border-zinc-600'
                            }`}>
                              {selectedCustomLists.includes(list.id) && <Check className="w-3 h-3" />}
                            </div>
                            <span className="flex-1 text-left truncate">{list.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inline create list */}
                    {isCreatingList ? (
                      <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg border border-zinc-700">
                        <input
                          type="text"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') createNewList();
                            if (e.key === 'Escape') {
                              setIsCreatingList(false);
                              setNewListName('');
                            }
                          }}
                          placeholder="List name..."
                          autoFocus
                          className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-500"
                          maxLength={50}
                        />
                        <button
                          onClick={createNewList}
                          disabled={!newListName.trim() || creatingListLoading}
                          className="p-1 text-green-500 hover:text-green-400 disabled:text-gray-600 disabled:cursor-not-allowed"
                        >
                          {creatingListLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingList(false);
                            setNewListName('');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreatingList(true)}
                        className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-zinc-600 text-sm text-gray-400 hover:text-white hover:border-zinc-500 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create new list...</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={createInvite}
                  disabled={inviteLoading || (selectedLists.length === 0 && selectedCustomLists.length === 0)}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
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
            {inviteTab === 'link' && inviteUrl && (
              <>
                <div className="mb-6">
                  <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-300 break-all font-mono">
                      {inviteUrl}
                    </p>
                  </div>

                  <button
                    onClick={copyInviteLink}
                    className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light rounded-xl font-semibold transition flex items-center justify-center gap-2"
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
              onClick={() => setShowInviteModal(false)}
              className="w-full mt-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
            >
              {(inviteTab === 'link' && inviteUrl) || (inviteTab === 'search' && directInviteSent) ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Shared Lists Modal */}
      {editingCollaboration && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingCollaboration(null)}
          />

          <div className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Edit Shared Lists</h2>
            <p className="text-gray-400 text-sm mb-6">
              Choose which lists to share with{' '}
              {editingCollaboration.isOwner
                ? editingCollaboration.collaboration.collaborator_name
                : editingCollaboration.collaboration.owner_name}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {Object.entries(listLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleEditList(key)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition ${
                    editLists.includes(key)
                      ? 'bg-brand-primary/10 border-brand-primary'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    editLists.includes(key)
                      ? 'bg-brand-primary border-brand-primary'
                      : 'border-zinc-600'
                  }`}>
                    {editLists.includes(key) && <Check className="w-3 h-3" />}
                  </div>
                  {listIcons[key]}
                  <span className="flex-1 text-left">{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={saveEditedLists}
              disabled={editLoading || editLists.length === 0}
              className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
            >
              {editLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>

            <button
              onClick={() => setEditingCollaboration(null)}
              className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
