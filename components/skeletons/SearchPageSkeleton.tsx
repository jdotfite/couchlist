'use client';

export default function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse mb-4" />

        {/* Search Input */}
        <div className="w-full h-12 bg-zinc-900 rounded-lg animate-pulse" />
      </header>

      <main className="px-4 pt-4">
        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-20 bg-zinc-800 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Browse Categories */}
        <section className="mb-8">
          <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </section>

        {/* Trending Row */}
        {[1, 2].map((row) => (
          <section key={row} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="h-7 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="overflow-x-auto scrollbar-hide -mx-4">
              <div className="flex gap-3 px-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0" style={{ width: 'calc(40% - 6px)' }}>
                    <div className="aspect-[2/3] rounded-lg bg-zinc-800 animate-pulse mb-2" />
                    <div className="h-5 w-full bg-zinc-800 rounded animate-pulse mb-1" />
                    <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Your Library */}
        <section className="mb-8">
          <div className="h-7 w-28 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center gap-2">
                <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
