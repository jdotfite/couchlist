'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Trash2, Users, Link as LinkIcon, UserPlus, UserMinus, Copy, Check, Search, Send, Clock, Mail } from 'lucide-react';
import IconPicker, { getIconComponent } from './IconPicker';
import ColorPicker, { getColorValue } from './ColorPicker';

interface CustomList {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_shared: boolean;
  item_count?: number;
}

interface Collaborator {
  id: number;
  user_id: number;
  role: 'owner' | 'collaborator';
  user_name?: string;
  user_email?: string;
}

interface Connection {
  id: number;
  name: string;
  email: string;
}

interface SearchResult {
  id: number;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
}

interface PendingInvite {
  id: number;
  invitee_id: number;
  invitee_name: string;
  invitee_username: string | null;
  created_at: string;
}

interface EditListModalProps {
  isOpen: boolean;
  list: CustomList | null;
  onClose: () => void;
  onUpdated: (list: CustomList) => void;
  onDeleted: (slug: string) => void;
}

export default function EditListModal({
  isOpen,
  list,
  onClose,
  onUpdated,
  onDeleted,
}: EditListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [color, setColor] = useState('gray');
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collaborator state
  const [activeTab, setActiveTab] = useState<'details' | 'collaborators'>('details');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [addingUser, setAddingUser] = useState<number | null>(null);
  const [removingUser, setRemovingUser] = useState<number | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sendingInvite, setSendingInvite] = useState<number | null>(null);
  const [cancelingInvite, setCancelingInvite] = useState<number | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
      setIcon(list.icon);
      setColor(list.color);
      setIsShared(list.is_shared);
      setActiveTab('details');
      setInviteCode(null);
      setSearchQuery('');
      setSearchResults([]);
      setPendingInvites([]);
      setInviteMessage('');
    }
  }, [list]);

  useEffect(() => {
    if (isOpen && list && activeTab === 'collaborators') {
      fetchCollaborators();
      fetchConnections();
      fetchPendingInvites();
    }
  }, [isOpen, list, activeTab]);

  const fetchCollaborators = async () => {
    if (!list) return;
    setLoadingCollaborators(true);
    try {
      const response = await fetch(`/api/custom-lists/${list.slug}/collaborators`);
      const data = await response.json();
      if (response.ok) {
        setCollaborators(data.collaborators || []);
      }
    } catch (err) {
      console.error('Failed to fetch collaborators:', err);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/custom-lists/connections');
      const data = await response.json();
      if (response.ok) {
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  const fetchPendingInvites = async () => {
    if (!list) return;
    try {
      const response = await fetch(`/api/invites/sent?listSlug=${list.slug}`);
      const data = await response.json();
      if (response.ok) {
        setPendingInvites(data.invites || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending invites:', err);
    }
  };

  // Debounced search function
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const sendInvite = async (userId: number) => {
    if (!list) return;
    setSendingInvite(userId);
    try {
      const response = await fetch(`/api/custom-lists/${list.slug}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaboratorId: userId,
          message: inviteMessage || null,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.method === 'direct') {
          // User was added directly (already connected)
          fetchCollaborators();
        } else {
          // Invite was sent
          fetchPendingInvites();
        }
        setSearchQuery('');
        setSearchResults([]);
        setInviteMessage('');
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
    } finally {
      setSendingInvite(null);
    }
  };

  const cancelInvite = async (inviteId: number) => {
    setCancelingInvite(inviteId);
    try {
      const response = await fetch(`/api/invites/${inviteId}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    } finally {
      setCancelingInvite(null);
    }
  };

  const generateInviteLink = async () => {
    if (!list) return;
    setGeneratingInvite(true);
    try {
      const response = await fetch(`/api/custom-lists/${list.slug}/invite`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok && data.inviteCode) {
        setInviteCode(data.inviteCode);
      }
    } catch (err) {
      console.error('Failed to generate invite:', err);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/lists/invite/${inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const addCollaborator = async (userId: number) => {
    if (!list) return;
    setAddingUser(userId);
    try {
      const response = await fetch(`/api/custom-lists/${list.slug}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId: userId }),
      });
      if (response.ok) {
        fetchCollaborators();
      }
    } catch (err) {
      console.error('Failed to add collaborator:', err);
    } finally {
      setAddingUser(null);
    }
  };

  const removeCollaborator = async (userId: number) => {
    if (!list) return;
    setRemovingUser(userId);
    try {
      const response = await fetch(`/api/custom-lists/${list.slug}/collaborators?collaboratorId=${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchCollaborators();
      }
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    } finally {
      setRemovingUser(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !name.trim()) {
      setError('List name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-lists/${list.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          is_shared: isShared,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update list');
        return;
      }

      onUpdated(data.list);
      handleClose();
    } catch (err) {
      setError('Failed to update list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!list) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-lists/${list.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete list');
        return;
      }

      onDeleted(list.slug);
      handleClose();
    } catch (err) {
      setError('Failed to delete list');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen || !list) return null;

  const IconComponent = getIconComponent(icon);
  const colorValue = getColorValue(color);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal - positioned above bottom nav on mobile */}
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto mb-16 sm:mb-0">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Edit List</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                activeTab === 'details'
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collaborators')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'collaborators'
                  ? 'bg-brand-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Collaborators
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm ? (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">Delete "{list.name}"?</h3>
              <p className="text-sm text-gray-400">
                {list.item_count
                  ? `The ${list.item_count} items in this list will be removed from it but stay in your library.`
                  : 'This list will be permanently deleted.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        ) : activeTab === 'collaborators' ? (
          /* Collaborators Tab */
          <div className="p-4 space-y-6">
            {loadingCollaborators ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Search for Users */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Find Users</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by username or email..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {searchResults
                        .filter(user => !collaborators.some(c => c.user_id === user.id))
                        .filter(user => !pendingInvites.some(inv => inv.invitee_id === user.id))
                        .map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                          >
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {user.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{user.name}</p>
                                {user.username && (
                                  <span className="text-xs text-gray-500">@{user.username}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <button
                              onClick={() => sendInvite(user.id)}
                              disabled={sendingInvite === user.id}
                              className="p-2 bg-brand-primary/20 hover:bg-brand-primary/30 rounded-lg text-brand-primary transition"
                              title="Send Invite"
                            >
                              {sendingInvite === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      {searchResults.length > 0 &&
                       searchResults.every(user =>
                         collaborators.some(c => c.user_id === user.id) ||
                         pendingInvites.some(inv => inv.invitee_id === user.id)
                       ) && (
                        <p className="text-sm text-gray-500 py-2 text-center">
                          All matching users are already collaborators or have pending invites.
                        </p>
                      )}
                    </div>
                  )}
                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No users found matching "{searchQuery}"
                    </p>
                  )}
                  {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Type at least 2 characters to search
                    </p>
                  )}
                </div>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Pending Invites
                    </h3>
                    <div className="space-y-2">
                      {pendingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{invite.invitee_name}</p>
                              {invite.invitee_username && (
                                <span className="text-xs text-gray-500">@{invite.invitee_username}</span>
                              )}
                            </div>
                            <p className="text-xs text-amber-500/80">Invite sent</p>
                          </div>
                          <button
                            onClick={() => cancelInvite(invite.id)}
                            disabled={cancelingInvite === invite.id}
                            className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-red-400 transition"
                            title="Cancel Invite"
                          >
                            {cancelingInvite === invite.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Collaborators */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Current Collaborators</h3>
                  {collaborators.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No collaborators yet. Search for users or generate an invite link.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {collaborators.map((collab) => (
                        <div
                          key={collab.user_id}
                          className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {collab.user_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{collab.user_name}</p>
                            <p className="text-xs text-gray-500 truncate">{collab.user_email}</p>
                          </div>
                          {collab.role === 'owner' ? (
                            <span className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-1 rounded">
                              Owner
                            </span>
                          ) : (
                            <button
                              onClick={() => removeCollaborator(collab.user_id)}
                              disabled={removingUser === collab.user_id}
                              className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-red-400 transition"
                            >
                              {removingUser === collab.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserMinus className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invite Link */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Invite via Link</h3>
                  {inviteCode ? (
                    <div className="p-3 bg-zinc-800 rounded-lg">
                      <p className="text-xs text-gray-400 mb-2">Share this link (expires in 7 days):</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/lists/invite/${inviteCode}`}
                          className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-sm text-gray-300"
                        />
                        <button
                          onClick={copyInviteLink}
                          className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded transition"
                        >
                          {copiedInvite ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateInviteLink}
                      disabled={generatingInvite}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                    >
                      {generatingInvite ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <LinkIcon className="w-5 h-5" />
                          Generate Invite Link
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Quick Add from Connections */}
                {connections.filter(conn => !collaborators.some(c => c.user_id === conn.id)).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Add from Connections</h3>
                    <div className="space-y-2">
                      {connections
                        .filter(conn => !collaborators.some(c => c.user_id === conn.id))
                        .map((conn) => (
                          <div
                            key={conn.id}
                            className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                          >
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {conn.name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{conn.name}</p>
                              <p className="text-xs text-gray-500 truncate">{conn.email}</p>
                            </div>
                            <button
                              onClick={() => addCollaborator(conn.id)}
                              disabled={addingUser === conn.id}
                              className="p-2 bg-brand-primary/20 hover:bg-brand-primary/30 rounded-lg text-brand-primary transition"
                            >
                              {addingUser === conn.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Details Tab - Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {/* Preview */}
            <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded-xl">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${colorValue}20` }}
              >
                <IconComponent className="w-6 h-6" style={{ color: colorValue }} />
              </div>
              <div>
                <p className="font-medium">{name || 'List Name'}</p>
                <p className="text-sm text-gray-400">
                  {description || 'No description'}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Date Night"
                maxLength={50}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              />
              <p className="text-xs text-gray-500 mt-1">{name.length}/50</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                maxLength={200}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/200</p>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Icon
              </label>
              <IconPicker selected={icon} onSelect={setIcon} color={colorValue} />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <ColorPicker selected={color} onSelect={setColor} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
