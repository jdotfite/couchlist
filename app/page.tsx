import { tmdbApi } from '@/lib/tmdb';

async function getTrendingMovies() {
  try {
    console.log('Fetching trending movies...');
    const response = await tmdbApi.get('/trending/movie/week');
    console.log('API Response:', response.data.results?.length, 'movies found');
    return response.data.results.slice(0, 5);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
}

export default async function Home() {
  const trendingMovies = await getTrendingMovies();
  console.log('Trending movies in component:', trendingMovies.length);

  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold text-center">
          Welcome to CouchList
        </h1>
        <p className="text-xl text-center text-gray-400">
          Track your favorite TV shows and movies
        </p>
        
        {/* API Test - Trending Movies */}
        <div className="w-full max-w-4xl mt-8 border border-yellow-500 p-4">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Trending This Week (API Test)</h2>
          <p className="text-sm text-gray-400 mb-4">Movies fetched: {trendingMovies.length}</p>
          {trendingMovies.length > 0 ? (
            <div className="grid gap-4">
              {trendingMovies.map((movie: any) => (
                <div key={movie.id} className="border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors bg-gray-800">
                  <h3 className="text-lg font-medium">{movie.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Rating: {movie.vote_average.toFixed(1)}/10 • Released: {movie.release_date}
                  </p>
                  {movie.overview && (
                    <p className="text-gray-300 text-sm mt-2 line-clamp-2">{movie.overview}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-500 p-4 rounded">
              <p className="text-red-400">⚠️ No trending movies available or API key not configured.</p>
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-8">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="/search"
          >
            Search Movies & TV Shows
          </a>
        </div>
      </main>
    </div>
  );
}
