'use client';

export default function AllListsSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="relative h-24 rounded-xl bg-zinc-800/50 animate-pulse overflow-hidden"
            >
              <div className="absolute top-3 left-3">
                <div className="w-5 h-5 rounded bg-zinc-700 mb-2" />
                <div className="h-4 w-16 bg-zinc-700 rounded" />
              </div>
              <div className="absolute bottom-3 left-3 h-3 w-12 bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
