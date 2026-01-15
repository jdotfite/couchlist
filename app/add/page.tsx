'use client';

import { useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import { Movie, TVShow, SearchResponse } from '@/types';

export default function AddPage() {
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string) => {
    // If query is empty, clear results and return to default view
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

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
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="px-4 pt-8 pb-6">
        <h1 className="text-3xl mb-2">Add Content</h1>
        <p className="text-gray-400 text-sm">
          Quickly add movies and shows to your lists
        </p>
      </header>

      <main className="px-4">
        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="mb-8">
            <SearchResults results={results} isLoading={isLoading} />
          </div>
        )}

        {/* Quick Add Options - Only show when not searching */}
        {!hasSearched && (
          <>
            <section className="mb-8">
              <h2 className="text-xl mb-4">Quick Add</h2>
          
          <div className="space-y-3">
            <button className="w-full bg-gradient-to-r from-[#8b5ef4] to-[#7040e0] rounded-lg p-4 flex items-center gap-3 hover:from-[#7040e0] hover:to-[#5a30c0] transition">
              <TrendingUp className="w-6 h-6" />
              <div className="text-left">
                <h3 className="font-semibold">What's Trending</h3>
                <p className="text-sm text-purple-100">Browse popular content</p>
              </div>
            </button>

            <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 flex items-center gap-3 hover:from-purple-700 hover:to-purple-800 transition">
              <Sparkles className="w-6 h-6" />
              <div className="text-left">
                <h3 className="font-semibold">AI Suggestions</h3>
                <p className="text-sm text-purple-100">Get personalized recommendations</p>
              </div>
            </button>
          </div>
        </section>

        {/* AI Assistant Placeholder */}
        <section className="mb-8">
          <h2 className="text-xl mb-4">AI Assistant</h2>
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Smart Tracking Assistant</h3>
                <p className="text-sm text-gray-400">
                  Tell me what you've watched, and I'll help you add it quickly!
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left text-sm transition">
                "I just finished watching Breaking Bad"
              </button>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left text-sm transition">
                "Show me movies like Inception"
              </button>
              <button className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left text-sm transition">
                "I watched The Office, what else would I like?"
              </button>
            </div>
          </div>
        </section>

        {/* Recently Added */}
        <section>
          <h2 className="text-xl mb-4">Recently Added by Others</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-sm">
              See what the community is watching
            </p>
          </div>
        </section>          </>
        )}      </main>
    </div>
  );
}
