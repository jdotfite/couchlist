'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import type { EpisodeWithStatus } from '@/types/episodes';
import { getImageUrl } from '@/lib/tmdb';
import Image from 'next/image';

interface EpisodeRowProps {
  episode: EpisodeWithStatus;
  onToggle: () => void;
  isUpdating: boolean;
}

export default function EpisodeRow({ episode, onToggle, isUpdating }: EpisodeRowProps) {
  const isWatched = episode.userStatus === 'watched';
  const isNext = episode.isNext;

  return (
    <button
      onClick={onToggle}
      disabled={isUpdating}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition
        ${isWatched ? 'bg-zinc-800/30 opacity-60' : 'bg-zinc-800/50 hover:bg-zinc-700/50'}
        disabled:opacity-50
      `}
    >
      {/* Checkbox/status indicator */}
      <div className="flex-shrink-0">
        {isUpdating ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin-fast" />
        ) : isWatched ? (
          <div className="w-5 h-5 bg-[#8b5ef4] rounded flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        ) : (
          <Circle className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Episode still/thumbnail */}
      {episode.still_path && (
        <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0 bg-zinc-900">
          <Image
            src={getImageUrl(episode.still_path, 'w185')}
            alt={episode.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Episode info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isWatched ? 'text-gray-500' : 'text-gray-300'}`}>
            E{episode.episode_number}
          </span>
          {isNext && !isWatched && (
            <span className="px-1.5 py-0.5 bg-[#8b5ef4] text-white text-[10px] font-bold rounded">
              NEXT
            </span>
          )}
        </div>
        <p className={`text-sm font-medium truncate ${isWatched ? 'text-gray-500' : 'text-white'}`}>
          {episode.name}
        </p>
        {episode.runtime && (
          <p className="text-xs text-gray-500">{episode.runtime} min</p>
        )}
      </div>
    </button>
  );
}
