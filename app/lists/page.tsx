'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Loader2, ListPlus } from 'lucide-react';
import ListCard from '@/components/lists/ListCard';
import CreateListModal from '@/components/lists/CreateListModal';

interface List {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  listType: string;
  isPublic: boolean;
  itemCount?: number;
}

export default function ListsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchLists();
    }
  }, [status, router]);

  const fetchLists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lists');
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleListCreated = (listId: number, slug: string) => {
    // Navigate to the new list
    router.push(`/lists/${slug}`);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">Your Lists</h1>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pt-4">
        {lists.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <ListPlus className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No lists yet</h2>
            <p className="text-gray-400 mb-6 max-w-xs">
              Create smart lists to automatically organize your library, or manual lists to curate your favorites.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium transition"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First List</span>
            </button>
          </div>
        ) : (
          // Lists grid
          <div className="space-y-3">
            {lists.map((list) => (
              <ListCard
                key={list.id}
                id={list.id}
                slug={list.slug}
                name={list.name}
                description={list.description}
                icon={list.icon}
                color={list.color}
                itemCount={list.itemCount || 0}
                isPublic={list.isPublic}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleListCreated}
      />
    </div>
  );
}
