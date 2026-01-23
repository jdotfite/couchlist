'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, Check, Filter } from 'lucide-react';

export type SortOption = 'title-asc' | 'title-desc' | 'rating-desc' | 'rating-asc' | 'added-desc' | 'added-asc';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'added-desc', label: 'Recently Added' },
  { value: 'added-asc', label: 'Oldest Added' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'rating-desc', label: 'Highest Rated' },
  { value: 'rating-asc', label: 'Lowest Rated' },
];

interface SortFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount?: number;
  placeholder?: string;
  // Optional filter button
  onFilterClick?: () => void;
  filterCount?: number;
}

export default function SortFilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  resultCount,
  placeholder = 'Search...',
  onFilterClick,
  filterCount = 0,
}: SortFilterBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort';

  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Search */}
      {isSearchOpen ? (
        <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 hover:bg-zinc-700 rounded transition"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              onSearchChange('');
            }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Search</span>
          </button>

          {/* Sort Dropdown */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{currentSortLabel}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-700 transition ${
                      sortBy === option.value ? 'text-brand-primary' : 'text-white'
                    }`}
                  >
                    {option.label}
                    {sortBy === option.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Button (optional) */}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                filterCount > 0
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-gray-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              {filterCount > 0 && (
                <span className="text-sm font-medium">{filterCount}</span>
              )}
            </button>
          )}

          {/* Result count */}
          {resultCount !== undefined && searchQuery && (
            <span className="text-xs text-gray-500 ml-auto">
              {resultCount} result{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </>
      )}
    </div>
  );
}

// Helper function to sort items
export function sortItems<T extends { title: string; rating?: number; added_date?: string }>(
  items: T[],
  sortBy: SortOption
): T[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'rating-desc':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'rating-asc':
      return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    case 'added-desc':
      return sorted.sort((a, b) => {
        const dateA = a.added_date ? new Date(a.added_date).getTime() : 0;
        const dateB = b.added_date ? new Date(b.added_date).getTime() : 0;
        return dateB - dateA;
      });
    case 'added-asc':
      return sorted.sort((a, b) => {
        const dateA = a.added_date ? new Date(a.added_date).getTime() : 0;
        const dateB = b.added_date ? new Date(b.added_date).getTime() : 0;
        return dateA - dateB;
      });
    default:
      return sorted;
  }
}

// Helper function to filter items by search query
export function filterItems<T extends { title: string }>(
  items: T[],
  searchQuery: string
): T[] {
  if (!searchQuery.trim()) return items;
  const query = searchQuery.toLowerCase().trim();
  return items.filter(item => item.title.toLowerCase().includes(query));
}
