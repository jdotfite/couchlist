'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Download, FileJson, FileSpreadsheet, Loader2, Check } from 'lucide-react';

export default function ExportPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const response = await fetch(`/api/export?format=${exportFormat}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `flicklog-export.${exportFormat}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

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
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Export Data</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {/* Info Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-gray-400">
            Export your entire watch history including all movies and TV shows you've tracked,
            along with your ratings, notes, and tags.
          </p>
        </div>

        {/* Format Selection */}
        <div>
          <h2 className="text-sm font-medium text-gray-300 mb-3">Choose Format</h2>
          <div className="space-y-2">
            <button
              onClick={() => setExportFormat('json')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition ${
                exportFormat === 'json'
                  ? 'bg-brand-primary/20 border border-brand-primary'
                  : 'bg-zinc-900 border border-transparent hover:bg-zinc-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                exportFormat === 'json' ? 'bg-brand-primary/30' : 'bg-zinc-800'
              }`}>
                <FileJson className={`w-5 h-5 ${exportFormat === 'json' ? 'text-brand-primary' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">JSON</h3>
                <p className="text-sm text-gray-400">Best for developers and data portability</p>
              </div>
              {exportFormat === 'json' && (
                <Check className="w-5 h-5 text-brand-primary" />
              )}
            </button>

            <button
              onClick={() => setExportFormat('csv')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition ${
                exportFormat === 'csv'
                  ? 'bg-brand-primary/20 border border-brand-primary'
                  : 'bg-zinc-900 border border-transparent hover:bg-zinc-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                exportFormat === 'csv' ? 'bg-brand-primary/30' : 'bg-zinc-800'
              }`}>
                <FileSpreadsheet className={`w-5 h-5 ${exportFormat === 'csv' ? 'text-brand-primary' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold">CSV</h3>
                <p className="text-sm text-gray-400">Open in Excel, Google Sheets, or any spreadsheet app</p>
              </div>
              {exportFormat === 'csv' && (
                <Check className="w-5 h-5 text-brand-primary" />
              )}
            </button>
          </div>
        </div>

        {/* What's Included */}
        <div>
          <h2 className="text-sm font-medium text-gray-300 mb-3">What's Included</h2>
          <ul className="bg-zinc-900 rounded-lg divide-y divide-zinc-800">
            <li className="px-4 py-3 text-sm text-gray-300">All movies and TV shows in your library</li>
            <li className="px-4 py-3 text-sm text-gray-300">Watch status (Watchlist, Watching, Finished, etc.)</li>
            <li className="px-4 py-3 text-sm text-gray-300">Your ratings (1-5 stars)</li>
            <li className="px-4 py-3 text-sm text-gray-300">Personal notes</li>
            <li className="px-4 py-3 text-sm text-gray-300">Tags (Favorites, Rewatch, Classics)</li>
            <li className="px-4 py-3 text-sm text-gray-300">Date added and TMDB links</li>
          </ul>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 py-4 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
              Exporting...
            </>
          ) : exportSuccess ? (
            <>
              <Check className="w-5 h-5" />
              Downloaded!
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download {exportFormat.toUpperCase()}
            </>
          )}
        </button>
      </main>
    </div>
  );
}
