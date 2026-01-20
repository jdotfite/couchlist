'use client';

import { Check } from 'lucide-react';
import type { SeasonProgress } from '@/types/episodes';

interface SeasonPillProps {
  season: SeasonProgress;
  isSelected: boolean;
  onTap: () => void;
}

export default function SeasonPill({ season, isSelected, onTap }: SeasonPillProps) {
  const { seasonNumber, totalEpisodes, watchedEpisodes, isComplete } = season;

  return (
    <button
      onClick={onTap}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition whitespace-nowrap flex-shrink-0
        ${isSelected
          ? 'bg-[#8b5ef4] text-white'
          : isComplete
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
        }
      `}
    >
      {isComplete && !isSelected ? (
        <Check className="w-3.5 h-3.5" />
      ) : null}
      <span>S{seasonNumber}</span>
      {!isComplete && (
        <span className="text-xs opacity-70">
          {watchedEpisodes}/{totalEpisodes}
        </span>
      )}
    </button>
  );
}
