'use client';

export default function ListsPageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="h-7 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </header>

      <main className="px-4">
        {/* Info box */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* List Items */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl">
              <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-28 bg-zinc-800 rounded animate-pulse mb-1" />
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Create button */}
        <div className="mt-4 h-14 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/30 animate-pulse" />
      </main>
    </div>
  );
}
