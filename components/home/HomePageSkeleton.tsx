'use client';

export default function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-7 w-[105px] bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Search Hero Skeleton */}
        <div className="card w-full mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-52 bg-zinc-800 rounded animate-pulse mb-1" />
              <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Lists Grid Skeleton */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="h-5 w-14 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden">
                <div className="w-16 h-16 bg-zinc-800 animate-pulse" />
                <div>
                  <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse mb-1" />
                  <div className="h-4 w-14 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Library Rows Skeleton (Continue Watching, Watchlist, Watched) */}
        {[1, 2, 3].map((i) => (
          <section key={i} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="h-7 w-40 bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-14 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="overflow-x-auto scrollbar-hide -mx-4">
              <div className="flex gap-3 px-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0" style={{ width: 'calc(40% - 6px)' }}>
                    <div className="aspect-[2/3] rounded-lg bg-zinc-800 animate-pulse mb-2" />
                    <div className="h-5 w-full bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
