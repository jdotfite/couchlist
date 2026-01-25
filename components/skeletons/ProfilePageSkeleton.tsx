'use client';

export default function ProfilePageSkeleton() {
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
        {/* Profile Card */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar with camera icon */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-zinc-800 animate-pulse" />
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-zinc-700 rounded-full animate-pulse" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="h-7 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>

          {/* Movie/TV counts inline */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Friends Section */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
            <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>

          <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-3" />

          {/* Friend cards */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-zinc-700 rounded animate-pulse mb-1" />
                    <div className="h-3 w-32 bg-zinc-700 rounded animate-pulse" />
                  </div>
                  <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Add Friend button */}
          <div className="mt-3 py-3 border-2 border-dashed border-zinc-700 rounded-xl">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mx-auto" />
          </div>
        </div>

        {/* Settings Links */}
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-28 bg-zinc-800 rounded animate-pulse mb-1" />
                <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}

          {/* Logout */}
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
            <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}
