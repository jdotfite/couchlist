'use client';

import { useState, useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import { Movie, TVShow, SearchResponse } from '@/types';
import Image from 'next/image';

const categories = [
  { id: 'trending_movies', label: 'Trending Movies', endpoint: '/trending/movie/week' },
  { id: 'trending_tv', label: 'Trending TV Shows', endpoint: '/trending/tv/week' },
  { id: 'popular_movies', label: 'Popular Movies', endpoint: '/movie/popular' },
  { id: 'popular_tv', label: 'Popular TV Shows', endpoint: '/tv/popular' },
  { id: 'top_rated_movies', label: 'Top Rated Movies', endpoint: '/movie/top_rated' },
  { id: 'top_rated_tv', label: 'Top Rated TV Shows', endpoint: '/tv/top_rated' },
];

export default function SearchPage() {
  const [results, setResults] = useState<(Movie | TVShow)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch images for categories
    const fetchCategoryImages = async () => {
      try {
        const response = await fetch('/api/trending');
        const data = await response.json();
        
        setCategoryImages({
          'popular_movies': data.popularMovies[0]?.poster_path || '',
          'popular_tv': data.popularTV[0]?.poster_path || '',
          'trending_movies': data.trendingMovies[0]?.poster_path || '',
          'top_rated_movies': data.topRatedMovies[0]?.poster_path || '',
        });
      } catch (error) {
        console.error('Failed to fetch category images:', error);
      }
    };

    fetchCategoryImages();
  }, []);

  const handleSearch = async (query: string) => {
    // If query is empty, clear results and return to default view
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
      setResults(data.results);
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

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="px-4 pt-8 pb-6">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-gray-400 text-sm">Find your next watch</p>
      </header>

      <main className="px-4">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Category Pills */}
        {hasSearched && (
          <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === category.id
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Browse Categories */}
        {!hasSearched && (
  <section className="mb-8">
    <h2 className="text-xl font-bold mb-4">Browse by Category</h2>
    <div className="grid grid-cols-2 gap-2">
      <button 
        onClick={() => handleCategoryClick('popular_movies')}
        className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-pink-600 to-pink-800 hover:from-pink-500 hover:to-pink-700 transition"
      >
        <h3 className="absolute top-3 left-3 font-bold text-lg z-10">Movies</h3>
        {categoryImages['popular_movies'] && (
          <div className="absolute bottom-0 right-0 w-20 h-20">
            <Image
              src={`https://image.tmdb.org/t/p/w200${categoryImages['popular_movies']}`}
              alt="Movies"
              fill
              style={{ marginTop: '10px' }}
              className="object-cover rounded rotate-45 ml-5 shadow-md"
              sizes="90px"
            />
          </div>
        )}
      </button>
      <button 
        onClick={() => handleCategoryClick('popular_tv')}
        className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 transition"
      >
        <h3 className="absolute top-3 left-3 font-bold text-lg z-10">TV Shows</h3>
        {categoryImages['popular_tv'] && (
          <div className="absolute bottom-0 right-0 w-20 h-20">
            <Image
              src={`https://image.tmdb.org/t/p/w200${categoryImages['popular_tv']}`}
              alt="TV Shows"
              fill
              style={{ marginTop: '10px' }}
              className="object-cover rounded rotate-45 ml-5 shadow-md"
              sizes="90px"
            />
          </div>
        )}
      </button>
      <button 
        onClick={() => handleCategoryClick('trending_movies')}
        className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 transition"
      >
        <h3 className="absolute top-3 left-3 font-bold text-lg z-10">Trending</h3>
        {categoryImages['trending_movies'] && (
          <div className="absolute bottom-0 right-0 w-20 h-20">
            <Image
              src={`https://image.tmdb.org/t/p/w200${categoryImages['trending_movies']}`}
              alt="Trending"
              fill
              style={{ marginTop: '10px' }}
              className="object-cover rounded rotate-45 ml-5 shadow-md"
              sizes="90px"
            />
          </div>
        )}
      </button>
      <button 
        onClick={() => handleCategoryClick('top_rated_movies')}
        className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 transition"
      >
        <h3 className="absolute top-3 left-3 font-bold text-lg z-10">Top Rated</h3>
        {categoryImages['top_rated_movies'] && (
          <div className="absolute bottom-0 right-0 w-20 h-20">
            <Image
              src={`https://image.tmdb.org/t/p/w200${categoryImages['top_rated_movies']}`}
              alt="Top Rated"
              fill
              style={{ marginTop: '10px' }}
              className="object-cover rounded rotate-45 ml-5 shadow-md"
              sizes="90px"
            />
          </div>
        )}
      </button>
    </div>
  </section>
)}

{/* Results */}
{hasSearched && (
  <div>
    <SearchResults results={results} isLoading={isLoading} />
  </div>
)}

{/* Popular Searches */}
{!hasSearched && (
  <section className="mb-8">
    <h2 className="text-xl font-bold mb-4">Popular Searches</h2>
    <div className="space-y-2">
      {['Breaking Bad', 'The Office', 'Inception', 'Stranger Things', 'The Dark Knight'].map((item) => (
        <button
          key={item}
          onClick={() => handleSearch(item)}
          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-4 text-left transition"
        >
          {item}
        </button>
      ))}
    </div>
  </section>
)}
      </main>
    </div>
  );
}
