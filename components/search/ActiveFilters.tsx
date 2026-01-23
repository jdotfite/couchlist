'use client';

import { X, Film, Tv } from 'lucide-react';
import { DiscoverFilters, PROVIDER_MAP, COMMON_GENRES } from '@/types/streaming';

interface ActiveFiltersProps {
  filters: DiscoverFilters;
  onRemoveProvider: (providerId: number) => void;
  onRemoveGenre: (genreId: number) => void;
  onClearType: () => void;
  onClearYear: () => void;
  onClearRating: () => void;
  onClearRuntime: () => void;
  onClearAll: () => void;
}

export default function ActiveFilters({
  filters,
  onRemoveProvider,
  onRemoveGenre,
  onClearType,
  onClearYear,
  onClearRating,
  onClearRuntime,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters =
    filters.providers.length > 0 ||
    filters.genres.length > 0 ||
    filters.type !== 'all' ||
    filters.yearMin ||
    filters.yearMax ||
    filters.ratingMin ||
    filters.runtimeMin ||
    filters.runtimeMax;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Type filter pill */}
        {filters.type !== 'all' && (
          <button
            onClick={onClearType}
            className="flex items-center gap-1.5 bg-brand-primary text-white rounded-full pl-3 pr-2 py-1.5 text-sm font-medium transition hover:bg-brand-primary/80"
          >
            {filters.type === 'movie' ? (
              <>
                <Film className="w-3.5 h-3.5" />
                Movies
              </>
            ) : (
              <>
                <Tv className="w-3.5 h-3.5" />
                TV Shows
              </>
            )}
            <X className="w-3.5 h-3.5 ml-1" />
          </button>
        )}

        {/* Provider pills */}
        {filters.providers.map(providerId => {
          const provider = PROVIDER_MAP[providerId];
          return (
            <button
              key={providerId}
              onClick={() => onRemoveProvider(providerId)}
              className="flex items-center gap-1.5 bg-brand-primary text-white rounded-full pl-3 pr-2 py-1.5 text-sm font-medium transition hover:bg-brand-primary/80"
            >
              {provider?.provider_name || `Provider ${providerId}`}
              <X className="w-3.5 h-3.5" />
            </button>
          );
        })}

        {/* Genre pills */}
        {filters.genres.map(genreId => {
          const genre = COMMON_GENRES.find(g => g.id === genreId);
          return (
            <button
              key={genreId}
              onClick={() => onRemoveGenre(genreId)}
              className="flex items-center gap-1.5 bg-brand-primary text-white rounded-full pl-3 pr-2 py-1.5 text-sm font-medium transition hover:bg-brand-primary/80"
            >
              {genre?.name || `Genre ${genreId}`}
              <X className="w-3.5 h-3.5" />
            </button>
          );
        })}

        {/* Year filter pill */}
        {(filters.yearMin || filters.yearMax) && (
          <button
            onClick={onClearYear}
            className="flex items-center gap-1.5 bg-brand-primary text-white rounded-full pl-3 pr-2 py-1.5 text-sm font-medium transition hover:bg-brand-primary/80"
          >
            {filters.yearMin && filters.yearMax
              ? `${filters.yearMin}-${filters.yearMax}`
              : filters.yearMin
              ? `${filters.yearMin}+`
              : `Before ${filters.yearMax}`}
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Rating filter pill */}
        {filters.ratingMin && (
          <button
            onClick={onClearRating}
            className="flex items-center gap-1.5 bg-brand-primary text-white rounded-full pl-3 pr-2 py-1.5 text-sm font-medium transition hover:bg-brand-primary/80"
          >
            {filters.ratingMin}+ Rating
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Runtime filter pill */}
        {(filters.runtimeMin || filters.runtimeMax) && (
          <button
            onClick={onClearRuntime}
            className="flex items-center gap-1.5 bg-brand-primary text-white rounded-full pl-3 pr-2 py-1.5 text-sm font-medium transition hover:bg-brand-primary/80"
          >
            {filters.runtimeMax && !filters.runtimeMin
              ? `< ${filters.runtimeMax}min`
              : filters.runtimeMin && !filters.runtimeMax
              ? `> ${filters.runtimeMin}min`
              : `${filters.runtimeMin}-${filters.runtimeMax}min`}
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Clear all button */}
      <button
        onClick={onClearAll}
        className="flex-shrink-0 text-sm text-gray-400 hover:text-white transition ml-2"
      >
        Clear
      </button>
    </div>
  );
}
