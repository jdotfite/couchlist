'use client';

import type { SeasonProgress } from '@/types/episodes';
import SeasonPill from './SeasonPill';

interface SeasonPillsProps {
  seasons: SeasonProgress[];
  selectedSeason: number | null;
  onSeasonTap: (seasonNumber: number) => void;
}

export default function SeasonPills({ seasons, selectedSeason, onSeasonTap }: SeasonPillsProps) {
  // Filter out Season 0 (specials) if present
  const regularSeasons = seasons.filter(s => s.seasonNumber > 0);

  if (regularSeasons.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2">
        {regularSeasons.map((season) => (
          <SeasonPill
            key={season.seasonNumber}
            season={season}
            isSelected={selectedSeason === season.seasonNumber}
            onTap={() => onSeasonTap(season.seasonNumber)}
          />
        ))}
      </div>
    </div>
  );
}
