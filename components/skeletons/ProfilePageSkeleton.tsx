'use client';

export default function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Profile Card */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="h-7 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-7 w-8 bg-zinc-800 rounded animate-pulse mx-auto mb-1" />
                <div className="h-4 w-14 bg-zinc-800 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Partner Section */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="h-12 w-full bg-zinc-800 rounded-lg animate-pulse" />
        </div>

        {/* Friends Section */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-3" />
          <div className="h-12 w-full bg-zinc-800 rounded-lg animate-pulse" />
        </div>

        {/* Settings Links */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
                <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mt-6">
          <div className="card flex items-center gap-3">
            <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
            <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
