'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Filter,
  Baby,
  Film,
  Tv,
  X,
  Loader2,
} from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';
import ManageListView, { ManageableItem } from '@/components/library/ManageListView';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'watching', label: 'Watching' },
  { value: 'finished', label: 'Finished' },
  { value: 'onhold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

export default function LibraryManagePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ManageableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [mediaType, setMediaType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [isKids, setIsKids] = useState<boolean | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [maxRating, setMaxRating] = useState<number | null>(null);
  const [minYear, setMinYear] = useState<number | null>(null);
  const [maxYear, setMaxYear] = useState<number | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchItems();
    }
  }, [authStatus, router]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (mediaType) params.set('mediaType', mediaType);
      if (status) params.set('status', status);
      if (isKids !== null) params.set('isKids', String(isKids));
      if (minRating) params.set('minRating', String(minRating));
      if (maxRating) params.set('maxRating', String(maxRating));
      if (minYear) params.set('minYear', String(minYear));
      if (maxYear) params.set('maxYear', String(maxYear));

      const res = await fetch(`/api/library/bulk?${params.toString()}`);
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

  const applyFilters = () => {
    setShowFilters(false);
    fetchItems();
  };

  const clearFilters = () => {
    setMediaType('');
    setStatus('');
    setIsKids(null);
    setMinRating(null);
    setMaxRating(null);
    setMinYear(null);
    setMaxYear(null);
    setSearchQuery('');
    setShowFilters(false);
    setTimeout(fetchItems, 0);
  };

  const activeFilterCount = [
    mediaType,
    status,
    isKids !== null,
    minRating,
    maxRating,
    minYear,
    maxYear,
  ].filter(Boolean).length;

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <header className="sticky top-0 z-20 bg-black px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Manage Library</h1>
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
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Manage Library</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      {/* Filter Bar */}
      <div className="sticky top-[57px] z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-brand-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Quick Kids Filter */}
          <button
            onClick={() => {
              setIsKids(isKids === true ? null : true);
              setTimeout(fetchItems, 0);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
              isKids === true
                ? 'bg-brand-primary text-white'
                : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            <Baby className="w-4 h-4" />
            Kids
          </button>

          {/* Search */}
          <input
            type="text"
            placeholder="Search titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {mediaType && (
              <span className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-full text-xs">
                {mediaType === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
                <button onClick={() => { setMediaType(''); fetchItems(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {status && (
              <span className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-full text-xs">
                {STATUS_OPTIONS.find((s) => s.value === status)?.label}
                <button onClick={() => { setStatus(''); fetchItems(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {isKids === true && (
              <span className="flex items-center gap-1 px-2 py-1 bg-brand-primary rounded-full text-xs">
                <Baby className="w-3 h-3" />
                Kids Content
                <button onClick={() => { setIsKids(null); fetchItems(); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Manage List View */}
      <ManageListView
        items={items}
        showStatus={true}
        onDelete={handleDelete}
        onMove={handleMove}
        onRefresh={fetchItems}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Filter Sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setShowFilters(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-600 rounded-full" />
            </div>

            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Media Type */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Type</label>
                  <div className="flex gap-2">
                    {[
                      { value: '', label: 'All', icon: null },
                      { value: 'movie', label: 'Movies', icon: Film },
                      { value: 'tv', label: 'TV Shows', icon: Tv },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMediaType(option.value)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                          mediaType === option.value
                            ? 'bg-brand-primary text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        {option.icon && <option.icon className="w-4 h-4" />}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kids Content */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Content Type</label>
                  <div className="flex gap-2">
                    {[
                      { value: null, label: 'All' },
                      { value: true, label: 'Kids Only' },
                      { value: false, label: 'Exclude Kids' },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        onClick={() => setIsKids(option.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${
                          isKids === option.value
                            ? 'bg-brand-primary text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Range */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Your Rating</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={minRating || ''}
                      onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Min</option>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <option key={r} value={r}>{r} ★</option>
                      ))}
                    </select>
                    <span className="text-gray-400">to</span>
                    <select
                      value={maxRating || ''}
                      onChange={(e) => setMaxRating(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Max</option>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <option key={r} value={r}>{r} ★</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Year Range */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Release Year</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="From"
                      value={minYear || ''}
                      onChange={(e) => setMinYear(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="number"
                      placeholder="To"
                      value={maxYear || ''}
                      onChange={(e) => setMaxYear(e.target.value ? Number(e.target.value) : null)}
                      className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
                >
                  Clear All
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium transition"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
