'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Users2, ArrowLeft } from 'lucide-react';
import ListsPageSkeleton from '@/components/skeletons/ListsPageSkeleton';
import NotificationBell from '@/components/notifications/NotificationBell';
import Image from 'next/image';

interface CollaborativeList {
  id: number;
  name: string;
  itemCount: number;
  createdAt: string;
  friendUserId: number;
  friendName: string;
  friendImage: string | null;
}

export default function ListsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [collaborativeLists, setCollaborativeLists] = useState<CollaborativeList[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCollaborativeLists();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchCollaborativeLists = async () => {
    try {
      const response = await fetch('/api/collaborative-lists');
      if (response.ok) {
        const data = await response.json();
        setCollaborativeLists(data.lists || []);
      }
    } catch (error) {
      console.error('Failed to fetch collaborative lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <ListsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Lists</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pb-24">
        {/* Collaborative Lists Section */}
        {collaborativeLists.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
              <Users2 className="w-4 h-4 text-brand-primary" />
              Shared With Friends ({collaborativeLists.length})
            </h2>
            <div className="space-y-2">
              {collaborativeLists.map((list) => (
                <Link
                  key={list.id}
                  href={`/friends/${list.friendUserId}`}
                  className="flex items-center gap-3 p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand-primary">
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
        ) : (
          <div className="text-center py-12">
            <Users2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No shared lists yet</h3>
            <p className="text-gray-500">
              Connect with friends to create shared watchlists together.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
