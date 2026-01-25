'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Users, Mail, Check, XCircle, Plus, Loader2, Users2 } from 'lucide-react';
import ListsPageSkeleton from '@/components/skeletons/ListsPageSkeleton';
import NotificationBell from '@/components/notifications/NotificationBell';
import Image from 'next/image';
import CreateListModal from '@/components/custom-lists/CreateListModal';
import EditListModal from '@/components/custom-lists/EditListModal';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';
import { ListVisibilityInline } from '@/components/sharing';

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

interface PendingInvite {
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

interface CollaborativeList {
  id: number;
  name: string;
  itemCount: number;
  createdAt: string;
  friendUserId: number;
  friendName: string;
  friendImage: string | null;
}

const MAX_LISTS = 10;

export default function ListsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomList | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [processingInvite, setProcessingInvite] = useState<number | null>(null);
  const [collaborativeLists, setCollaborativeLists] = useState<CollaborativeList[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLists();
      fetchPendingInvites();
      fetchCollaborativeLists();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/custom-lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const response = await fetch('/api/invites/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending invites:', error);
    }
  };

  const fetchCollaborativeLists = async () => {
    try {
      const response = await fetch('/api/collaborative-lists');
      if (response.ok) {
        const data = await response.json();
        setCollaborativeLists(data.lists || []);
      }
    } catch (error) {
      console.error('Failed to fetch collaborative lists:', error);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    setProcessingInvite(inviteId);
    try {
      const response = await fetch(`/api/invites/${inviteId}/accept`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
        // Refresh lists to show the new shared list
        fetchLists();
        // Optionally navigate to the new list
        if (data.listSlug) {
          router.push(`/lists/${data.listSlug}`);
        }
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    setProcessingInvite(inviteId);
    try {
      const response = await fetch(`/api/invites/${inviteId}/decline`, {
        method: 'POST',
      });
      if (response.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to decline invite:', error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleCreated = (list: CustomList) => {
    setLists([...lists, list]);
  };

  const handleUpdated = (updatedList: CustomList) => {
    setLists(lists.map(l => l.slug === updatedList.slug ? updatedList : l));
  };

  const handleDeleted = (slug: string) => {
    setLists(lists.filter(l => l.slug !== slug));
  };

  if (status === 'loading' || isLoading) {
    return <ListsPageSkeleton />;
  }

  const canCreateMore = lists.length < MAX_LISTS;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">My Lists</h1>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pb-24">
        {/* Pending Invites Banner */}
        {pendingInvites.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-primary" />
              Pending Invitations ({pendingInvites.length})
            </h2>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Sender Avatar */}
                  <div className="flex-shrink-0">
                    {invite.sender.image ? (
                      <Image
                        src={invite.sender.image}
                        alt={invite.sender.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {invite.sender.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{invite.sender.name}</span>
                      {invite.sender.username && (
                        <span className="text-gray-400 ml-1">@{invite.sender.username}</span>
                      )}
                      <span className="text-gray-400"> invited you to collaborate on </span>
                      <span className="font-medium text-brand-primary">{invite.listName}</span>
                    </p>
                    {invite.message && (
                      <p className="text-sm text-gray-400 mt-1 italic">"{invite.message}"</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAcceptInvite(invite.id)}
                        disabled={processingInvite === invite.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary-light transition disabled:opacity-50"
                      >
                        {processingInvite === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin-fast text-gray-400" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Accept
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite.id)}
                        disabled={processingInvite === invite.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-zinc-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-zinc-600 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Collaborative Lists Section */}
        {collaborativeLists.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
              <Users2 className="w-4 h-4 text-green-400" />
              Shared With Friends ({collaborativeLists.length})
            </h2>
            <div className="space-y-2">
              {collaborativeLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/friends/${list.friendUserId}`}
                  className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-xl transition"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-500/20">
                    <Users2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{list.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{list.itemCount} items</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {list.friendImage ? (
                          <Image
                            src={list.friendImage}
                            alt={list.friendName}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 bg-zinc-600 rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-medium">
                              {list.friendName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        with {list.friendName}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-400">
            Create custom lists to organize your movies and TV shows.
            You can have up to {MAX_LISTS} custom lists.
          </p>
        </div>

        {/* Lists */}
        {lists.length === 0 ? (
          <div className="space-y-2">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl transition group"
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-zinc-800 group-hover:bg-zinc-700">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-semibold text-gray-300 group-hover:text-white">Create your first list</h3>
                <p className="text-sm text-gray-500">Organize your way</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white flex-shrink-0" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => {
              const IconComponent = getIconComponent(list.icon);
              const colorValue = getColorValue(list.color);

              return (
                <div
                  key={list.slug}
                  className="flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
                >
                  <Link
                    href={`/lists/${list.slug}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colorValue }}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{list.name}</h3>
                        {list.is_shared && (
                          <Users className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{list.item_count || 0} items</span>
                        <ListVisibilityInline listType="custom" listId={list.id} />
                        {list.description && <span className="truncate">• {list.description}</span>}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setEditingList(list)}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition text-gray-400"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* List count */}
        {lists.length > 0 && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {lists.length} of {MAX_LISTS} lists used
          </p>
        )}

        {/* Create more button */}
        {lists.length > 0 && canCreateMore && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full mt-4 flex items-center gap-3 p-3 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl transition group"
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-zinc-800 group-hover:bg-zinc-700">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-semibold text-gray-300 group-hover:text-white">Create new list</h3>
              <p className="text-sm text-gray-500">Organize your way</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white flex-shrink-0" />
          </button>
        )}
      </main>

      {/* Modals */}
      <CreateListModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <EditListModal
        isOpen={!!editingList}
        list={editingList}
        onClose={() => setEditingList(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
