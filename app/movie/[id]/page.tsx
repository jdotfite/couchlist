import { tmdbApi } from '@/lib/tmdb';
import { MovieDetails } from '@/types';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Calendar, Clock, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

async function getMovieDetails(id: string): Promise<MovieDetails | null> {
  try {
    const response = await tmdbApi.get<MovieDetails>(`/movie/${id}`, {
      params: { append_to_response: 'credits' },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching movie details:', {
      id,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      message: error?.message,
      endpoint: `/movie/${id}`,
      errorType: error?.constructor?.name,
      fullError: JSON.stringify(error, null, 2),
    });
    return null;
  }
}

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovieDetails(id);

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Movie not found</h1>
          <Link href="/search" className="text-blue-500 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const director = movie.credits?.crew.find((person) => person.job === 'Director');
  const mainCast = movie.credits?.cast.slice(0, 6) || [];

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative w-full h-[50vh] sm:h-[60vh]">
        <Image
          src={getImageUrl(movie.backdrop_path, 'original')}
          alt={movie.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {/* Back Button */}
        <Link
          href="/search"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="relative -mt-32 z-10 px-6 sm:px-8 lg:px-12 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="relative w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={getImageUrl(movie.poster_path)}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-xl text-gray-400 italic">{movie.tagline}</p>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {movie.vote_average > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold">{movie.vote_average.toFixed(1)}/10</span>
                  </div>
                )}
                
                {movie.release_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                  </div>
                )}

                {movie.runtime > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 bg-gray-800 rounded-full text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Overview */}
              <div>
                <h2 className="text-2xl font-semibold mb-3">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                  {movie.overview || 'No overview available.'}
                </p>
              </div>

              {/* Director */}
              {director && (
                <div>
                  <h3 className="text-sm text-gray-400 mb-1">Director</h3>
                  <p className="font-semibold">{director.name}</p>
                </div>
              )}

              {/* Cast */}
              {mainCast.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Cast</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {mainCast.map((actor) => (
                      <div key={actor.id} className="text-center">
                        <div className="relative w-full aspect-[2/3] mb-2 rounded-lg overflow-hidden bg-gray-800">
                          <Image
                            src={getImageUrl(actor.profile_path, 'w185')}
                            alt={actor.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="font-medium text-sm">{actor.name}</p>
                        <p className="text-xs text-gray-400">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
