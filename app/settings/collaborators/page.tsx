'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
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
} from 'lucide-react';

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
  finished: 'Finished',
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

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
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Shared Lists</h1>
            <p className="text-xs text-gray-400">Collaborate with others</p>
          </div>
          <button
            onClick={() => {
              setShowInviteModal(true);
              setInviteUrl(null);
            }}
            className="p-2 bg-brand-primary hover:bg-brand-primary-light rounded-full transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-6">
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

        {/* Empty state */}
        {collaborations.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No shared lists yet</h2>
            <p className="text-gray-400 mb-6 max-w-xs mx-auto">
              Invite someone to collaborate on your movie and TV show lists.
            </p>
            <button
              onClick={() => {
                setShowInviteModal(true);
                setInviteUrl(null);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light rounded-full font-semibold transition"
            >
              <Share2 className="w-4 h-4" />
              Invite Someone
            </button>
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
                        Stop sharing lists with {partnerName}?
                      </p>
                      <ul className="text-xs text-gray-500 mb-4 space-y-1">
                        <li>• You'll stop seeing each other's items</li>
                        <li>• Items already in your lists will stay</li>
                        <li>• Nothing gets deleted</li>
                      </ul>
                      <div className="flex gap-2">
                        <button
                          onClick={() => removeCollaboration(collaboration.id)}
                          className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition"
                        >
                          Stop Sharing
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
            <h2 className="text-xl font-bold mb-2">Invite to Collaborate</h2>
            <p className="text-gray-400 text-sm mb-4">
              Share this link with someone to collaborate on your lists.
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Want to share a custom list instead?{' '}
              <Link href="/lists" className="text-brand-primary hover:underline" onClick={() => setShowInviteModal(false)}>
                Go to My Lists
              </Link>
            </p>

            {!inviteUrl ? (
              <>
                {/* List selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3">Select lists to share</h3>
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

                <button
                  onClick={createInvite}
                  disabled={inviteLoading || selectedLists.length === 0}
                  className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" />
                      Create Invite Link
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Invite URL */}
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
              {inviteUrl ? 'Done' : 'Cancel'}
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
