'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronRight, Loader2, Users } from 'lucide-react';
import CreateListModal from '@/components/custom-lists/CreateListModal';
import EditListModal from '@/components/custom-lists/EditListModal';
import { getIconComponent } from '@/components/custom-lists/IconPicker';
import { getColorValue } from '@/components/custom-lists/ColorPicker';

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

const MAX_LISTS = 10;

export default function ListsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomList | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLists();
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
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const canCreateMore = lists.length < MAX_LISTS;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">My Lists</h1>
          {canCreateMore && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="p-2 bg-brand-primary hover:bg-brand-primary-light rounded-full transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="px-4 pt-6">
        {/* Info box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">
            Create custom lists to organize your movies and TV shows.
            You can have up to {MAX_LISTS} custom lists.
          </p>
        </div>

        {/* Lists */}
        {lists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No custom lists yet</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-light rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create your first list
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
                      style={{ backgroundColor: `${colorValue}20` }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: colorValue }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{list.name}</h3>
                        {list.is_shared && (
                          <Users className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {list.item_count || 0} items
                        {list.description && ` • ${list.description}`}
                      </p>
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
          <p className="text-center text-sm text-gray-500 mt-6">
            {lists.length} of {MAX_LISTS} lists used
          </p>
        )}

        {/* Create more button */}
        {lists.length > 0 && canCreateMore && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full mt-4 py-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-gray-400 hover:text-white transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create new list
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
