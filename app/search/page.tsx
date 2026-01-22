'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, X, Film, Tv } from 'lucide-react';
import SearchResults from '@/components/SearchResults';
import TrendingRow from '@/components/home/TrendingRow';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import { Movie, TVShow, SearchResponse } from '@/types';
import Image from 'next/image';
import Link from 'next/link';

interface TrendingItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

const categories = [
  { id: 'trending_movies', label: 'Trending Movies', type: 'movies' },
  { id: 'trending_tv', label: 'Trending TV', type: 'tv' },
  { id: 'popular_movies', label: 'Popular Movies', type: 'movies' },
  { id: 'popular_tv', label: 'Popular TV', type: 'tv' },
  { id: 'top_rated_movies', label: 'Top Rated Movies', type: 'movies' },
  { id: 'top_rated_tv', label: 'Top Rated TV', type: 'tv' },
];


export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('type') || 'all';
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>(initialFilter as 'all' | 'movies' | 'tv');
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [trendingAll, setTrendingAll] = useState<TrendingItem[]>([]);
  const [popularAll, setPopularAll] = useState<TrendingItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        const response = await fetch('/api/trending');
        const data = await response.json();

        setCategoryImages({
          'movies': data.trendingMovies[0]?.poster_path || '',
          'tv': data.trendingTV[0]?.poster_path || '',
          'trending': data.trendingMovies[1]?.poster_path || data.trendingTV[0]?.poster_path || '',
          'top_rated': data.topRatedMovies[0]?.poster_path || '',
        });

        // Combine movies and TV, interleaved for variety
        const trending = [...(data.trendingMovies || []), ...(data.trendingTV || [])];
        const popular = [...(data.popularMovies || []), ...(data.popularTV || [])];

        // Shuffle to mix content types
        const shuffleMix = (arr: TrendingItem[]) => {
          const result: TrendingItem[] = [];
          const movies = arr.filter(i => i.media_type === 'movie');
          const tv = arr.filter(i => i.media_type === 'tv');
          const maxLen = Math.max(movies.length, tv.length);
          for (let i = 0; i < maxLen; i++) {
            if (movies[i]) result.push(movies[i]);
            if (tv[i]) result.push(tv[i]);
          }
          return result;
        };

        setTrendingAll(shuffleMix(trending).slice(0, 15));
        setPopularAll(shuffleMix(popular).slice(0, 15));
      } catch (error) {
        console.error('Failed to fetch trending data:', error);
      }
    };

    fetchTrendingData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      setSelectedCategory(null);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [query, filter]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedCategory(null);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&type=multi`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse<Movie | TVShow> = await response.json();

      // Filter based on current filter
      let filteredResults = data.results;
      if (filter === 'movies') {
        filteredResults = data.results.filter((item: any) => item.media_type === 'movie' || item.title);
      } else if (filter === 'tv') {
        filteredResults = data.results.filter((item: any) => item.media_type === 'tv' || item.name);
      }

      setResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setHasSearched(true);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/browse?category=${categoryId}`);
      if (!response.ok) throw new Error('Failed to fetch category');

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to fetch category:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = (item: TrendingItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const filteredCategories = categories.filter(cat => {
    if (filter === 'all') return true;
    return cat.type === filter;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <h1 className="text-xl font-bold mb-4">Search</h1>

        {/* Search Input */}
        <div className="relative">
          {isLoading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies & TV shows..."
            className="w-full h-12 pl-11 pr-12 bg-zinc-900 rounded-lg border border-transparent text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary transition-all"
          />

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
      </header>

      <main className="px-4 pt-4">
        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'all' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('movies')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'movies' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </button>
          <button
            onClick={() => setFilter('tv')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'tv' ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            <Tv className="w-4 h-4" />
            TV Shows
          </button>
        </div>

        {/* Category Pills when searching */}
        {hasSearched && (
          <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === category.id
                      ? 'bg-brand-primary text-white'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Browse Categories - Default View */}
        {!hasSearched && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Browse</h2>
            <div className="grid grid-cols-2 gap-3">
              {(filter === 'all' || filter === 'movies') && (
                <button
                  onClick={() => handleCategoryClick('popular_movies')}
                  className="relative h-28 rounded-lg overflow-hidden bg-gradient-to-br from-pink-600 to-pink-800 hover:from-pink-500 hover:to-pink-700 transition"
                >
                  <h3 className="absolute top-3 left-3 text-lg font-semibold z-10">Movies</h3>
                  {categoryImages['movies'] && (
                    <div className="absolute bottom-0 right-0 w-20 h-20">
                      <Image
                        src={`https://image.tmdb.org/t/p/w200${categoryImages['movies']}`}
                        alt="Movies"
                        fill
                        style={{ marginTop: '10px' }}
                        className="object-cover rounded rotate-12 shadow-md"
                        sizes="90px"
                      />
                    </div>
                  )}
                </button>
              )}

              {(filter === 'all' || filter === 'tv') && (
                <button
                  onClick={() => handleCategoryClick('popular_tv')}
                  className="relative h-28 rounded-lg overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 transition"
                >
                  <h3 className="absolute top-3 left-3 text-lg font-semibold z-10">TV Shows</h3>
                  {categoryImages['tv'] && (
                    <div className="absolute bottom-0 right-0 w-20 h-20">
                      <Image
                        src={`https://image.tmdb.org/t/p/w200${categoryImages['tv']}`}
                        alt="TV Shows"
                        fill
                        style={{ marginTop: '10px' }}
                        className="object-cover rounded rotate-12 shadow-md"
                        sizes="90px"
                      />
                    </div>
                  )}
                </button>
              )}

              <button
                onClick={() => handleCategoryClick(filter === 'tv' ? 'trending_tv' : 'trending_movies')}
                className="relative h-28 rounded-lg overflow-hidden bg-gradient-to-br from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 transition"
              >
                <h3 className="absolute top-3 left-3 text-lg font-semibold z-10">Trending</h3>
                {categoryImages['trending'] && (
                  <div className="absolute bottom-0 right-0 w-20 h-20">
                    <Image
                      src={`https://image.tmdb.org/t/p/w200${categoryImages['trending']}`}
                      alt="Trending"
                      fill
                      style={{ marginTop: '10px' }}
                      className="object-cover rounded rotate-12 shadow-md"
                      sizes="90px"
                    />
                  </div>
                )}
              </button>

              <button
                onClick={() => handleCategoryClick(filter === 'tv' ? 'top_rated_tv' : 'top_rated_movies')}
                className="relative h-28 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 transition"
              >
                <h3 className="absolute top-3 left-3 text-lg font-semibold z-10">Top Rated</h3>
                {categoryImages['top_rated'] && (
                  <div className="absolute bottom-0 right-0 w-20 h-20">
                    <Image
                      src={`https://image.tmdb.org/t/p/w200${categoryImages['top_rated']}`}
                      alt="Top Rated"
                      fill
                      style={{ marginTop: '10px' }}
                      className="object-cover rounded rotate-12 shadow-md"
                      sizes="90px"
                    />
                  </div>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Search Results */}
        {hasSearched && (
          <div className="mb-8">
            <SearchResults results={results} isLoading={isLoading} />
          </div>
        )}

        {/* Trending Now - Default View */}
        {!hasSearched && (
          <TrendingRow
            title="Trending Now"
            items={filter === 'all' ? trendingAll : trendingAll.filter(i => filter === 'movies' ? i.media_type === 'movie' : i.media_type === 'tv')}
            onAddClick={handleAddClick}
          />
        )}

        {/* Popular - Default View */}
        {!hasSearched && (
          <TrendingRow
            title="Popular"
            items={filter === 'all' ? popularAll : popularAll.filter(i => filter === 'movies' ? i.media_type === 'movie' : i.media_type === 'tv')}
            onAddClick={handleAddClick}
          />
        )}

        {/* Quick Links - Default View */}
        {!hasSearched && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Your Library</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/library?type=tv"
                className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 text-center transition flex flex-col items-center gap-2"
              >
                <Tv className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Your TV Shows</span>
              </Link>
              <Link
                href="/library?type=movie"
                className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 text-center transition flex flex-col items-center gap-2"
              >
                <Film className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Your Movies</span>
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* Media Options Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          mediaId={selectedItem.id}
          mediaType={selectedItem.media_type}
          title={selectedItem.title || selectedItem.name || 'Unknown'}
          posterPath={selectedItem.poster_path || ''}
        />
      )}
    </div>
  );
}
