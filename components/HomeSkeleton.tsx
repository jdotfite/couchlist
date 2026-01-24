'use client';

const rowSkeletons = [
  'Trending Movies',
  'Trending TV Shows',
  'Popular Movies',
  'Popular TV Shows',
  'Top Rated Movies',
  'Top Rated TV Shows',
];

export default function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="overflow-x-auto scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
          <div className="flex items-center gap-2 px-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-9 w-20 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-9 w-24 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-9 w-24 rounded-full bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="px-4 space-y-8">
        <section>
          <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden">
                <div className="w-16 h-16 bg-zinc-800 animate-pulse" />
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>

        {rowSkeletons.map((title) => (
          <section key={title}>
            <div className="flex items-center justify-between mb-2">
              <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="overflow-x-auto scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0" style={{ width: 'calc(40% - 6px)' }}>
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 animate-pulse mb-2" />
                    <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse mb-1" />
                    <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
                <div className="flex-shrink-0 w-1" />
              </div>
            </div>
          </section>
        ))}

        <section>
          <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
