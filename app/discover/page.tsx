'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import { Movie, TVShow, SearchResponse } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';

const categories = [
  { id: 'trending_movies', label: 'Trending Movies', type: 'movies' },
  { id: 'trending_tv', label: 'Trending TV', type: 'tv' },
  { id: 'popular_movies', label: 'Popular Movies', type: 'movies' },
  { id: 'popular_tv', label: 'Popular TV', type: 'tv' },
  { id: 'top_rated_movies', label: 'Top Rated Movies', type: 'movies' },
  { id: 'top_rated_tv', label: 'Top Rated TV', type: 'tv' },
];

const popularSearches = [
  { name: 'Breaking Bad', type: 'tv' },
  { name: 'The Office', type: 'tv' },
  { name: 'Inception', type: 'movies' },
  { name: 'Stranger Things', type: 'tv' },
  { name: 'The Dark Knight', type: 'movies' },
  { name: 'Game of Thrones', type: 'tv' },
  { name: 'Interstellar', type: 'movies' },
  { name: 'The Mandalorian', type: 'tv' },
];

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>(initialFilter as 'all' | 'movies' | 'tv');
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCategoryImages = async () => {
      try {
        const response = await fetch('/api/trending');
        const data = await response.json();

        setCategoryImages({
          'movies': data.trendingMovies[0]?.poster_path || '',
          'tv': data.trendingTV[0]?.poster_path || '',
          'trending': data.trendingMovies[1]?.poster_path || data.trendingTV[0]?.poster_path || '',
          'top_rated': data.topRatedMovies[0]?.poster_path || '',
        });
      } catch (error) {
        console.error('Failed to fetch category images:', error);
      }
    };

    fetchCategoryImages();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      setSelectedCategory(null);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSelectedCategory(null);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&type=multi`);

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

  const filteredCategories = categories.filter(cat => {
    if (filter === 'all') return true;
    return cat.type === filter;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3 mb-4">
          <ProfileMenu />
          <h1 className="text-2xl font-bold">Discover</h1>
        </div>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </header>

      <main className="px-4 pt-4">
        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'all' ? 'bg-[#8b5ef4] text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('movies')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'movies' ? 'bg-[#8b5ef4] text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setFilter('tv')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === 'tv' ? 'bg-[#8b5ef4] text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
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
                      ? 'bg-[#8b5ef4] text-white'
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

        {/* Popular Searches - Default View */}
        {!hasSearched && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Popular Searches</h2>
            <div className="space-y-2">
              {popularSearches
                .filter(item => filter === 'all' || item.type === filter)
                .map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleSearch(item.name)}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 text-left transition"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Quick Links */}
        {!hasSearched && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Quick Links</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/shows"
                className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 text-center transition"
              >
                <span className="text-sm">Your TV Shows</span>
              </Link>
              <Link
                href="/movies"
                className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-4 text-center transition"
              >
                <span className="text-sm">Your Movies</span>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
