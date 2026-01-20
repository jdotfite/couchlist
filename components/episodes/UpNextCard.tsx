'use client';

import { Play, Loader2 } from 'lucide-react';

interface UpNextCardProps {
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  runtime: number | null;
  onMarkWatched: () => void;
  isUpdating: boolean;
}

export default function UpNextCard({
  seasonNumber,
  episodeNumber,
  episodeName,
  runtime,
  onMarkWatched,
  isUpdating,
}: UpNextCardProps) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-[#8b5ef4]/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Play className="w-5 h-5 text-[#8b5ef4]" fill="currentColor" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[#8b5ef4] font-medium">UP NEXT</p>
          <p className="text-sm font-medium truncate">
            S{seasonNumber}E{episodeNumber}: {episodeName}
          </p>
          {runtime && (
            <p className="text-xs text-gray-500">{runtime} min</p>
          )}
        </div>
      </div>
      <button
        onClick={onMarkWatched}
        disabled={isUpdating}
        className="px-3 py-1.5 bg-[#8b5ef4] hover:bg-[#7a4ed3] disabled:opacity-50 rounded-lg text-sm font-medium transition flex-shrink-0 flex items-center gap-1.5"
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Mark Watched'
        )}
      </button>
    </div>
  );
}
