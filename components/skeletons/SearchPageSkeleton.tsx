'use client';

export default function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header - matches MainHeader with search input */}
      <header className="sticky top-0 z-40 bg-black px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* ProfileMenu avatar */}
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
            {/* Title */}
            <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
          {/* NotificationBell */}
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        </div>

        {/* Search Input with Filter Button */}
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-zinc-900 rounded-lg animate-pulse" />
          <div className="w-14 h-12 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
      </header>

      <main className="px-4">
        {/* Browse by Service - 4x2 grid */}
        <section className="mb-6">
          <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </section>

        {/* Trending Now Row */}
        <section className="mb-6">
          <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="overflow-x-auto scrollbar-hide -mx-4">
            <div className="flex gap-3 px-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[2/3] rounded-lg bg-zinc-800 animate-pulse mb-2" />
                  <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-1" />
                  <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top Rated Row */}
        <section className="mb-6">
          <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="overflow-x-auto scrollbar-hide -mx-4">
            <div className="flex gap-3 px-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[2/3] rounded-lg bg-zinc-800 animate-pulse mb-2" />
                  <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-1" />
                  <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
