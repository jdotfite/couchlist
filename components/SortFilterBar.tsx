'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, CheckSquare } from 'lucide-react';
import LayoutToggle, { LayoutOption } from '@/components/ui/LayoutToggle';

export type SortOption = 'title-asc' | 'title-desc' | 'rating-desc' | 'rating-asc' | 'added-desc' | 'added-asc';
export { type LayoutOption } from '@/components/ui/LayoutToggle';

interface SortFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
  placeholder?: string;
  // Filter button (optional - sort is in filter sheet when used)
  onFilterClick?: () => void;
  filterCount?: number;
  // Optional layout toggle
  layout?: LayoutOption;
  onLayoutChange?: (layout: LayoutOption) => void;
  // Optional select/manage mode
  isSelectMode?: boolean;
  onSelectModeChange?: (isSelectMode: boolean) => void;
  // Callback when search active state changes (for hiding status chips)
  onSearchActiveChange?: (isActive: boolean) => void;
}

export default function SortFilterBar({
  searchQuery,
  onSearchChange,
  resultCount,
  placeholder = 'Search...',
  onFilterClick,
  filterCount = 0,
  layout,
  onLayoutChange,
  isSelectMode,
  onSelectModeChange,
  onSearchActiveChange,
}: SortFilterBarProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notify parent when search active state changes
  useEffect(() => {
    onSearchActiveChange?.(isSearchActive);
  }, [isSearchActive, onSearchActiveChange]);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  const handleSearchClose = () => {
    setIsSearchActive(false);
    onSearchChange('');
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Search - Full width pill when inactive, expands when active */}
      {isSearchActive ? (
        <div className="flex-1 min-w-0 flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2.5">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 hover:bg-zinc-700 rounded transition flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={handleSearchClose}
            className="text-xs text-gray-400 hover:text-white flex-shrink-0 ml-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Search Pill - Full width, tappable */}
          <button
            onClick={() => setIsSearchActive(true)}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition text-left"
          >
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-500">{placeholder}</span>
          </button>

          {/* Filter Button (includes sort) */}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-lg transition ${
                filterCount > 0
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-gray-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              {filterCount > 0 && <span className="text-sm">{filterCount}</span>}
            </button>
          )}

          {/* Layout Toggle (optional) */}
          {onLayoutChange && layout && (
            <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
          )}

          {/* Select Mode Toggle (optional) */}
          {onSelectModeChange !== undefined && (
            <button
              onClick={() => onSelectModeChange(!isSelectMode)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg transition ${
                isSelectMode
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-gray-400'
              }`}
            >
              {isSelectMode ? (
                <>
                  <X className="w-4 h-4" />
                  <span className="text-sm">Cancel</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm">Select</span>
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Result count - only show when searching */}
      {resultCount !== undefined && searchQuery && (
        <span className="flex-shrink-0 text-xs text-gray-500 ml-1">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// Helper function to sort items
export function sortItems<T extends { title: string; rating?: number | null; added_date?: string }>(
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
