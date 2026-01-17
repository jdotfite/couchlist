'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MovieDetails } from '@/types';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Calendar, Clock, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import StarRatingPopup from '@/components/StarRatingPopup';

export default function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [id, setId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      setId(p.id);
      try {
        const response = await fetch(`/api/movie/${p.id}`);
        if (response.ok) {
          const data = await response.json();
          setMovie(data);
        }
      } catch (error) {
        console.error('Failed to fetch movie:', error);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  // Fetch user's rating when logged in and movie is loaded
  useEffect(() => {
    if (session?.user && movie?.id) {
      fetch(`/api/rating?tmdb_id=${movie.id}&media_type=movie`)
        .then(res => res.json())
        .then(data => setUserRating(data.rating))
        .catch(err => console.error('Failed to fetch rating:', err));
    }
  }, [session, movie?.id]);

  const handleRatingChange = async (rating: number) => {
    if (!movie) return;

    const previousRating = userRating;
    setUserRating(rating === 0 ? null : rating);

    try {
      const response = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: movie.id,
          media_type: 'movie',
          title: movie.title,
          poster_path: movie.poster_path,
          rating,
        }),
      });

      if (!response.ok) {
        setUserRating(previousRating);
      }
    } catch (error) {
      console.error('Failed to update rating:', error);
      setUserRating(previousRating);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 mb-4">Movie not found</h1>
          <Link href="/search" className="text-blue-500 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const director = movie.credits?.crew.find((person) => person.job === 'Director');
  const mainCast = movie.credits?.cast.slice(0, 6) || [];
  const tmdbRating = movie.vote_average.toFixed(1);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Hero Poster */}
      <div className="relative w-full aspect-[2/3] max-h-[70vh]">
        <Image
          src={getImageUrl(movie.poster_path)}
          alt={movie.title}
          fill
          className="object-cover"
          priority
        />

        {/* Gradient fade at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <Link
            href="/search"
            className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <button
            onClick={() => setIsSheetOpen(true)}
            className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Below Poster */}
      <div className="px-4 pt-2 space-y-3">
        {/* Ratings Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {movie.vote_average > 0 && (
            <div className="bg-yellow-400 text-black px-2 py-0.5 rounded font-bold text-xs">
              IMDb {tmdbRating}
            </div>
          )}
          {session?.user && (
            <>
              <div className="w-px h-4 bg-zinc-700" />
              <StarRatingPopup
                rating={userRating}
                onRate={handleRatingChange}
              />
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold">{movie.title}</h1>

        {/* Genres */}
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {movie.genres.slice(0, 4).map((genre) => (
              <span
                key={genre.id}
                className="px-3 py-1 bg-zinc-800 rounded-full text-sm"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        <p className="text-gray-300 text-sm leading-relaxed">
          {movie.overview || 'No overview available.'}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-2">
          {movie.release_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(movie.release_date).getFullYear()}</span>
            </div>
          )}
          {movie.runtime > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
            </div>
          )}
          {director && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Dir.</span>
              <span>{director.name}</span>
            </div>
          )}
        </div>

        {/* Cast */}
        {mainCast.length > 0 && (
          <div className="pt-4">
            <h2 className="text-lg font-semibold mb-3">Cast</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {mainCast.map((actor) => (
                <div key={actor.id} className="text-center">
                  <div className="relative w-full aspect-[2/3] mb-1.5 rounded-lg overflow-hidden bg-zinc-900">
                    <Image
                      src={getImageUrl(actor.profile_path, 'w185')}
                      alt={actor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="font-medium text-xs line-clamp-1">{actor.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      <MediaOptionsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={movie.title}
        posterPath={getImageUrl(movie.poster_path)}
        mediaType="movie"
        mediaId={movie.id}
      />
    </div>
  );
}
