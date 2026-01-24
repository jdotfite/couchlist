'use client';

interface MediaListSkeletonProps {
  layout?: 'list' | 'grid';
  count?: number;
  showHeader?: boolean;
}

export default function MediaListSkeleton({
  layout = 'list',
  count = 8,
  showHeader = true,
}: MediaListSkeletonProps) {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header Skeleton */}
      {showHeader && (
        <header className="sticky top-0 z-10 bg-black px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <div className="w-8 h-8 rounded-md bg-zinc-700 animate-pulse" />
              <div className="w-8 h-8 rounded-md bg-zinc-700 animate-pulse" />
            </div>
          </div>
        </header>
      )}

      <main className="px-4">
        {layout === 'list' ? (
          <div className="space-y-1">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg"
              >
                {/* Poster */}
                <div className="w-14 h-20 flex-shrink-0 rounded-md bg-zinc-800 animate-pulse" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Actions */}
                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-zinc-800 rounded-lg mb-2" />
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Inline skeleton for use within existing page layouts
export function MediaListInlineSkeleton({
  layout = 'list',
  count = 8,
}: Omit<MediaListSkeletonProps, 'showHeader'>) {
  if (layout === 'list') {
    return (
      <div className="space-y-1">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg"
          >
            <div className="w-14 h-20 flex-shrink-0 rounded-md bg-zinc-800 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-zinc-800 rounded-lg mb-2" />
          <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
