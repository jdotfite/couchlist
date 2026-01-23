'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';
import ManageListView, { ManageableItem } from '@/components/library/ManageListView';
import { useListPreferences } from '@/hooks/useListPreferences';

const STATUS_CONFIG: Record<string, { title: string; apiPath: string }> = {
  watching: { title: 'Watching', apiPath: '/api/watching' },
  watchlist: { title: 'Watchlist', apiPath: '/api/watchlist' },
  finished: { title: 'Finished', apiPath: '/api/watched' },
  onhold: { title: 'On Hold', apiPath: '/api/onhold' },
  dropped: { title: 'Dropped', apiPath: '/api/dropped' },
};

export default function ManageStatusListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: status } = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const { getListName } = useListPreferences();

  const [items, setItems] = useState<ManageableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const config = STATUS_CONFIG[status];
  const displayName = getListName(status) || config?.title || status;

  useEffect(() => {
    if (!config) {
      router.push('/library');
      return;
    }

    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchItems();
    }
  }, [authStatus, router, config]);

  const fetchItems = async () => {
    if (!config) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/library/bulk?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (mediaIds: number[]) => {
    const res = await fetch('/api/library/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds }),
    });
    if (!res.ok) throw new Error('Failed to delete');
  };

  const handleMove = async (mediaIds: number[], targetStatus: string) => {
    const res = await fetch('/api/library/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds, newStatus: targetStatus }),
    });
    if (!res.ok) throw new Error('Failed to move');
  };

  if (!config) {
    return null;
  }

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <header className="sticky top-0 z-20 bg-black px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link href={`/library/${status}`} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Manage {displayName}</h1>
          </div>
        </header>
        <main className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/library/${status}`} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Manage {displayName}</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      {/* Search Bar */}
      <div className="sticky top-[57px] z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search titles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {/* Manage List View */}
      <ManageListView
        items={items}
        showStatus={false}
        currentList={status}
        onDelete={handleDelete}
        onMove={handleMove}
        onRefresh={fetchItems}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
}
