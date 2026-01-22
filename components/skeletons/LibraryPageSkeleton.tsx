'use client';

export default function LibraryPageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Total Count */}
        <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse mb-6" />

        {/* List Cards */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden">
              <div className="flex items-center p-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 ml-4">
                  <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse mb-1" />
                  <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Preview Posters */}
                <div className="flex mr-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="w-8 h-12 rounded bg-zinc-800 animate-pulse"
                      style={{ marginLeft: index === 0 ? 0 : -16, zIndex: index }}
                    />
                  ))}
                </div>

                <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Custom Lists Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-7 w-28 bg-zinc-800 rounded animate-pulse" />
            <div className="h-5 w-14 bg-zinc-800 rounded animate-pulse" />
          </div>

          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden">
                <div className="flex items-center p-4">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />
                  <div className="flex-1 ml-4">
                    <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse mb-1" />
                    <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                  </div>
                  <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
