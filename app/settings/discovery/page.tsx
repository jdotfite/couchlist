'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronUp, ChevronDown, Plus, X, Loader2, GripVertical } from 'lucide-react';
import { useDiscoveryRows } from '@/hooks/useDiscoveryRows';
import AddRowBottomSheet from '@/components/search/AddRowBottomSheet';
import StreamingServiceIcon, { STREAMING_COLORS } from '@/components/icons/StreamingServiceIcons';

// Map row types to streaming provider IDs for icons
const PLATFORM_PROVIDER_IDS: Record<string, number> = {
  best_on_netflix: 8,
  best_on_max: 1899,
  best_on_disney_plus: 337,
  best_on_hulu: 15,
  best_on_prime_video: 9,
  best_on_apple_tv_plus: 350,
  best_on_peacock: 386,
  best_on_paramount_plus: 531,
};

export default function DiscoverySettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);

  const {
    rows,
    loading,
    availableByCategory,
    addRow,
    removeRow,
    moveRow,
  } = useDiscoveryRows();

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">Discovery Rows</h1>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Info Text */}
        <p className="text-gray-400 text-sm mb-6">
          Customize which content rows appear on the Search page. Drag to reorder or use the arrows.
        </p>

        {/* Rows List */}
        <div className="space-y-2">
          {rows.map((row, index) => {
            const providerId = PLATFORM_PROVIDER_IDS[row.rowType];

            return (
              <div
                key={row.rowType}
                className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3"
              >
                {/* Drag Handle (visual only for now) */}
                <div className="text-gray-500 cursor-grab">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Icon for platform rows */}
                {providerId ? (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: STREAMING_COLORS[providerId] || '#374151' }}
                  >
                    <StreamingServiceIcon
                      providerId={providerId}
                      size={18}
                      className="text-white"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{getRowEmoji(row.rowType)}</span>
                  </div>
                )}

                {/* Row Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{row.config.label}</div>
                  <div className="text-sm text-gray-400 truncate">{row.config.description}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveRow(row.rowType, 'up')}
                    disabled={index === 0}
                    className={`p-1.5 rounded transition ${
                      index === 0
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => moveRow(row.rowType, 'down')}
                    disabled={index === rows.length - 1}
                    className={`p-1.5 rounded transition ${
                      index === rows.length - 1
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeRow(row.rowType)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-zinc-800 transition"
                    aria-label="Remove row"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {rows.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No discovery rows added yet.</p>
            <p className="text-sm mt-1">Add some rows to customize your Search page.</p>
          </div>
        )}

        {/* Add Row Button */}
        <button
          onClick={() => setIsAddRowOpen(true)}
          className="w-full mt-4 py-3 border-2 border-dashed border-zinc-700 hover:border-brand-primary rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-brand-primary transition"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Row</span>
        </button>
      </main>

      {/* Add Row Bottom Sheet */}
      <AddRowBottomSheet
        isOpen={isAddRowOpen}
        onClose={() => setIsAddRowOpen(false)}
        availableByCategory={availableByCategory}
        addedRows={rows.map(r => r.rowType)}
        onAddRow={addRow}
      />
    </div>
  );
}

// Helper to get emoji for non-platform rows
function getRowEmoji(rowType: string): string {
  const emojiMap: Record<string, string> = {
    trending_now: '🔥',
    trending_movies: '🎬',
    trending_tv: '📺',
    free_with_ads: '🆓',
    in_theaters: '🎭',
    new_on_streaming: '✨',
    coming_soon: '📅',
    airing_this_week: '📆',
    top_rated: '⭐',
    underrated_gems: '💎',
    comfort_watches: '🛋️',
    dark_and_intense: '🌑',
    turn_your_brain_off: '🍿',
    cry_it_out: '😢',
    late_night_weird: '🌙',
  };
  return emojiMap[rowType] || '📋';
}
