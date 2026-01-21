'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Share2, ChevronRight, Shield, Download, Upload, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin-fast-fast text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="px-4 pt-6">
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
              <p className="text-sm text-gray-400">Manage show alerts and notification preferences</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings/privacy"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Privacy & Profile</h3>
              <p className="text-sm text-gray-400">Manage your username and privacy settings</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings/collaborators"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Shared Lists</h3>
              <p className="text-sm text-gray-400">Collaborate with others on your lists</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings/import"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Import Data</h3>
              <p className="text-sm text-gray-400">Import from Letterboxd, Trakt, or IMDb</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>

          <Link
            href="/settings/export"
            className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Export Data</h3>
              <p className="text-sm text-gray-400">Download your watch history as CSV or JSON</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </Link>
        </div>
      </main>
    </div>
  );
}
