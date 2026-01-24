'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Film, Tv, Baby, Star, Check, ArrowDownAZ, ArrowUpAZ, Clock, StarIcon } from 'lucide-react';
import { SortOption } from '@/components/SortFilterBar';

export interface LibraryFilters {
  mediaType: 'all' | 'movie' | 'tv';
  kidsContent: 'all' | 'kids' | 'exclude';
  minRating: number | null;
  maxRating: number | null;
  minYear: number | null;
  maxYear: number | null;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  mediaType: 'all',
  kidsContent: 'all',
  minRating: null,
  maxRating: null,
  minYear: null,
  maxYear: null,
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'added-desc', label: 'Recently Added' },
  { value: 'added-asc', label: 'Oldest Added' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'rating-desc', label: 'Highest Rated' },
  { value: 'rating-asc', label: 'Lowest Rated' },
];

interface LibraryFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  onApply: () => void;
  resultCount?: number;
}

export default function LibraryFilterSheet({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  onApply,
  resultCount,
}: LibraryFilterSheetProps) {
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

  const clearAll = () => {
    onFiltersChange(DEFAULT_LIBRARY_FILTERS);
  };

  const handleApply = () => {
    onApply();
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const hasFilters =
    filters.mediaType !== 'all' ||
    filters.kidsContent !== 'all' ||
    filters.minRating !== null ||
    filters.maxRating !== null ||
    filters.minYear !== null ||
    filters.maxYear !== null;

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
            <h2 className="text-lg font-semibold">Filter Library</h2>
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
          {/* Sort Options */}
          {onSortChange && sortBy && (
            <section className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sort By</h3>
              <div className="flex gap-2 flex-wrap">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onSortChange(option.value)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                      sortBy === option.value
                        ? 'bg-brand-primary text-white'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {option.label}
                    {sortBy === option.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Type Filter */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Type</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onFiltersChange({ ...filters, mediaType: 'all' })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.mediaType === 'all'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, mediaType: 'movie' })}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.mediaType === 'movie'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <Film className="w-4 h-4" />
                Movies
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, mediaType: 'tv' })}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.mediaType === 'tv'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <Tv className="w-4 h-4" />
                TV Shows
              </button>
            </div>
          </section>

          {/* Kids Content Filter */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <span className="flex items-center gap-2">
                <Baby className="w-4 h-4" />
                Kids Content
              </span>
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFiltersChange({ ...filters, kidsContent: 'all' })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.kidsContent === 'all'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                All Content
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, kidsContent: 'kids' })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.kidsContent === 'kids'
                    ? 'bg-pink-500 text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                Kids Only
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, kidsContent: 'exclude' })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filters.kidsContent === 'exclude'
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                Exclude Kids
              </button>
            </div>
          </section>

          {/* Your Rating */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Your Rating
              </span>
            </h3>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => {
                    if (filters.minRating === rating && filters.maxRating === rating) {
                      onFiltersChange({ ...filters, minRating: null, maxRating: null });
                    } else {
                      onFiltersChange({ ...filters, minRating: rating, maxRating: rating });
                    }
                  }}
                  className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                    filters.minRating === rating && filters.maxRating === rating
                      ? 'bg-yellow-500 text-black'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {rating} <Star className="w-3 h-3 fill-current" />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Tap to filter by exact rating</p>
          </section>

          {/* Year Range */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Release Year</h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                placeholder="From"
                min={1900}
                max={new Date().getFullYear()}
                value={filters.minYear || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minYear: e.target.value ? parseInt(e.target.value) : null,
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
                value={filters.maxYear || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxYear: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </section>

          {/* Quick Year Presets */}
          <section className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFiltersChange({ ...filters, minYear: 2020, maxYear: null })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.minYear === 2020 && filters.maxYear === null
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                2020s
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, minYear: 2010, maxYear: 2019 })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.minYear === 2010 && filters.maxYear === 2019
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                2010s
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, minYear: 2000, maxYear: 2009 })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.minYear === 2000 && filters.maxYear === 2009
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                2000s
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, minYear: 1990, maxYear: 1999 })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.minYear === 1990 && filters.maxYear === 1999
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                90s
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, minYear: null, maxYear: 1989 })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filters.minYear === null && filters.maxYear === 1989
                    ? 'bg-brand-primary text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                Classics
              </button>
            </div>
          </section>
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

// Helper to count active filters
export function countActiveFilters(filters: LibraryFilters): number {
  let count = 0;
  if (filters.mediaType !== 'all') count++;
  if (filters.kidsContent !== 'all') count++;
  if (filters.minRating !== null || filters.maxRating !== null) count++;
  if (filters.minYear !== null || filters.maxYear !== null) count++;
  return count;
}

// Helper to check if any filters are active
export function hasActiveFilters(filters: LibraryFilters): boolean {
  return countActiveFilters(filters) > 0;
}
