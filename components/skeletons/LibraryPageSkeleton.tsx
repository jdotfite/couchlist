'use client';

export default function LibraryPageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header - matches MainHeader */}
      <header className="bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ProfileMenu avatar */}
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
            {/* Title */}
            <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
          {/* NotificationBell */}
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </header>

      <main className="px-4">
        {/* SectionHeader - "Your Library" with "View All" CTA */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* System List Cards - 6 cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden">
              <div className="flex items-center p-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 ml-4">
                  <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse mb-1" />
                  <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Preview Posters - stacked */}
                <div className="flex mr-2">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      className="w-8 h-12 rounded bg-zinc-800 animate-pulse flex-shrink-0"
                      style={{
                        marginLeft: index === 0 ? 0 : -16,
                        zIndex: index,
                      }}
                    />
                  ))}
                </div>

                {/* Arrow */}
                <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Custom Lists Section */}
        <div className="mt-8">
          {/* SectionHeader - "Custom Lists" with "Manage" CTA */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
            <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Custom list cards placeholder */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="flex items-center p-4">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />
                  <div className="flex-1 ml-4">
                    <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse mb-1" />
                    <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  </div>
                  <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QuickStats Skeleton */}
        <div className="mt-8">
          {/* SectionHeader */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Top Row - Watch Time & Library */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
            <div className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
          </div>

          {/* Category Cards Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
            <div className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
            <div className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
            <div className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
