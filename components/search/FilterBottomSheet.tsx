'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronUp, Film, Tv } from 'lucide-react';
import { DiscoverFilters, TOP_US_PROVIDERS, COMMON_GENRES, SORT_OPTIONS } from '@/types/streaming';
import StreamingServiceIcon, { STREAMING_COLORS } from '@/components/icons/StreamingServiceIcons';

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
  onApply: () => void;
  resultCount?: number;
}

export default function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  resultCount,
}: FilterBottomSheetProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleProvider = (providerId: number) => {
    const newProviders = filters.providers.includes(providerId)
      ? filters.providers.filter(id => id !== providerId)
      : [...filters.providers, providerId];
    onFiltersChange({ ...filters, providers: newProviders });
  };

  const toggleGenre = (genreId: number) => {
    const newGenres = filters.genres.includes(genreId)
      ? filters.genres.filter(id => id !== genreId)
      : [...filters.genres, genreId];
    onFiltersChange({ ...filters, genres: newGenres });
  };

  const clearAll = () => {
    onFiltersChange({
      type: 'all',
      providers: [],
      genres: [],
      sortBy: 'popularity.desc',
    });
  };

  const handleApply = () => {
    onApply();
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const hasFilters =
    filters.providers.length > 0 ||
    filters.genres.length > 0 ||
    filters.type !== 'all' ||
    filters.yearMin ||
    filters.yearMax ||
    filters.ratingMin;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-zinc-900 rounded-t-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 -ml-1 hover:bg-zinc-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-sm text-brand-primary hover:text-brand-primary/80 transition"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Type Filter */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Type</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onFiltersChange({ ...filters, type: 'all' })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.type === 'all'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, type: 'movie' })}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.type === 'movie'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <Film className="w-4 h-4" />
                Movies
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, type: 'tv' })}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.type === 'tv'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <Tv className="w-4 h-4" />
                TV Shows
              </button>
            </div>
          </section>

          {/* Streaming Services */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Streaming Services
            </h3>
            <div className="flex flex-wrap gap-2">
              {TOP_US_PROVIDERS.map(provider => {
                const isSelected = filters.providers.includes(provider.provider_id);
                const bgColor = STREAMING_COLORS[provider.provider_id] || '#374151';
                return (
                  <button
                    key={provider.provider_id}
                    onClick={() => toggleProvider(provider.provider_id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isSelected
                        ? 'bg-brand-primary text-white ring-2 ring-brand-primary ring-offset-2 ring-offset-zinc-900'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: bgColor }}
                    >
                      <StreamingServiceIcon
                        providerId={provider.provider_id}
                        size={14}
                        className="text-white"
                      />
                    </div>
                    <span>{provider.provider_name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Genres */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {COMMON_GENRES.slice(0, 12).map(genre => {
                const isSelected = filters.genres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? 'bg-brand-primary text-white'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* More Filters Toggle */}
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
          >
            {showMoreFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {showMoreFilters ? 'Less Filters' : 'More Filters'}
            </span>
          </button>

          {/* Advanced Filters */}
          {showMoreFilters && (
            <div className="space-y-6 border-t border-zinc-800 pt-4">
              {/* Year Range */}
              <section>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Year</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="From"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={filters.yearMin || ''}
                    onChange={e =>
                      onFiltersChange({
                        ...filters,
                        yearMin: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    placeholder="To"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={filters.yearMax || ''}
                    onChange={e =>
                      onFiltersChange({
                        ...filters,
                        yearMax: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </section>

              {/* Rating */}
              <section>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Minimum Rating
                </h3>
                <div className="flex gap-2">
                  {[5, 6, 7, 8].map(rating => (
                    <button
                      key={rating}
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          ratingMin: filters.ratingMin === rating ? undefined : rating,
                        })
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        filters.ratingMin === rating
                          ? 'bg-brand-primary text-white'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {rating}+
                    </button>
                  ))}
                </div>
              </section>

              {/* Runtime (Movies only) */}
              {filters.type !== 'tv' && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Runtime
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          runtimeMax: filters.runtimeMax === 90 ? undefined : 90,
                          runtimeMin: undefined,
                        })
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        filters.runtimeMax === 90
                          ? 'bg-brand-primary text-white'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      &lt; 90 min
                    </button>
                    <button
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          runtimeMin:
                            filters.runtimeMin === 90 && filters.runtimeMax === 120 ? undefined : 90,
                          runtimeMax:
                            filters.runtimeMin === 90 && filters.runtimeMax === 120 ? undefined : 120,
                        })
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        filters.runtimeMin === 90 && filters.runtimeMax === 120
                          ? 'bg-brand-primary text-white'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      90-120 min
                    </button>
                    <button
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          runtimeMin: filters.runtimeMin === 120 ? undefined : 120,
                          runtimeMax: undefined,
                        })
                      }
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        filters.runtimeMin === 120 && !filters.runtimeMax
                          ? 'bg-brand-primary text-white'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      &gt; 120 min
                    </button>
                  </div>
                </section>
              )}

              {/* Sort By */}
              <section>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Sort By
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => onFiltersChange({ ...filters, sortBy: option.value })}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        filters.sortBy === option.value
                          ? 'bg-brand-primary text-white'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-zinc-800 bg-zinc-900">
          <button
            onClick={handleApply}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 rounded-lg transition"
          >
            {resultCount !== undefined ? `Show Results (${resultCount})` : 'Apply Filters'}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
