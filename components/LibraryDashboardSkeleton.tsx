'use client';

export default function LibraryDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-7 w-28 bg-zinc-800 rounded animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-2">
        {/* Continue section */}
        <section className="mb-6">
          <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="flex gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-zinc-900 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-12 h-16 rounded-lg bg-zinc-800 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Status Categories */}
        <section className="mb-6">
          <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-zinc-800/50 animate-pulse"
              />
            ))}
          </div>
        </section>

        {/* Tags Section */}
        <section className="mb-6">
          <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-zinc-800/50 animate-pulse"
              />
            ))}
          </div>
        </section>

        {/* All Button */}
        <div className="h-12 w-full rounded-lg bg-zinc-800/50 animate-pulse" />
      </main>
    </div>
  );
}
