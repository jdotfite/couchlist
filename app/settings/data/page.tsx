'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Upload, RefreshCw } from 'lucide-react';

export default function DataSyncPage() {
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
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin-fast" />
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
          <h1 className="text-xl font-bold">Data & Sync</h1>
        </div>
      </header>

      <main className="px-4">
        <p className="text-gray-400 mb-6">
          Import your watch history, sync with external services, or export your data.
        </p>

        <div className="space-y-2">
          <Link
            href="/settings/import"
            className="card card-interactive flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Import</h3>
              <p className="text-sm text-gray-400">Import from Letterboxd or IMDb</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/settings/trakt"
            className="card card-interactive flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Trakt Sync</h3>
              <p className="text-sm text-gray-400">Sync watch history from Kodi, Plex, and more</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href="/settings/export"
            className="card card-interactive flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Export</h3>
              <p className="text-sm text-gray-400">Download your watch history as CSV or JSON</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </main>
    </div>
  );
}
