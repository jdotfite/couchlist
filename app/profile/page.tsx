'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight, Bell, Shield, Share2, Upload, Download,
  LogOut, Settings, BarChart3, Film, Tv
} from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useProfileImage } from '@/hooks/useProfileImage';

interface LibraryCounts {
  movies: number;
  tv: number;
  total: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { profileImage } = useProfileImage();
  const [counts, setCounts] = useState<LibraryCounts>({ movies: 0, tv: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCounts();
    }
  }, [status]);

  const fetchCounts = async () => {
    try {
      // Fetch all lists to count items
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

      setCounts({
        movies,
        tv,
        total: movies + tv,
      });
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Profile Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                  {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-sm text-gray-400 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">{counts.movies}</span>
                <span className="text-gray-400"> movies</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                <span className="font-semibold">{counts.tv}</span>
                <span className="text-gray-400"> shows</span>
              </span>
            </div>
          </div>
        </div>

        {/* Settings Links */}
        <div className="space-y-2">
          <Link
            href="/settings/notifications"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-gray-400">Manage show alerts</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Settings</h3>
              <p className="text-sm text-gray-400">Privacy, lists, and more</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings/collaborators"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Shared Lists</h3>
              <p className="text-sm text-gray-400">Collaborate with others</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <div className="h-px bg-zinc-800 my-4" />

          <Link
            href="/settings/import"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Import Data</h3>
              <p className="text-sm text-gray-400">From Letterboxd, Trakt, or IMDb</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings/export"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Export Data</h3>
              <p className="text-sm text-gray-400">Download your watch history</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <div className="h-px bg-zinc-800 my-4" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 bg-zinc-900 hover:bg-red-900/20 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-red-400">Log Out</h3>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
