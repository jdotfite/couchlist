'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import { Movie, TVShow, SearchResponse } from '@/types';

export default function SearchPage() {
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&type=multi`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse<Movie | TVShow> = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Search</h1>
          <p className="text-gray-400">Find movies and TV shows</p>
        </div>

        {/* Search Bar */}
        <div className="flex justify-center mb-12">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="mt-8">
            <SearchResults results={results} isLoading={isLoading} />
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="text-center py-16">
            <p className="text-xl text-gray-400">Start searching to find movies and TV shows</p>
          </div>
        )}
      </div>
    </div>
  );
}
