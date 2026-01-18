'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const onSearchRef = useRef(onSearch);
  
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    // Debounce search - wait 500ms after user stops typing
    const timer = setTimeout(() => {
      // Always call search handler, even with empty query
      onSearchRef.current(query.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="relative">
      {/* Search Icon or Loading Spinner */}
      {isLoading ? (
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
      ) : (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      )}
      
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for movies or TV shows..."
        className="w-full h-12 pl-11 pr-12 bg-zinc-900 bg-surface-2 rounded-lg border border-transparent text-white placeholder-text-muted focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_1px_rgb(var(--brand-primary))] transition-all"
      />
      
      {/* Clear Button */}
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
