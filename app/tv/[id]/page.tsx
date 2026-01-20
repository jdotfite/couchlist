'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TVShowDetails } from '@/types';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Calendar, Tv, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import StarRatingPopup from '@/components/StarRatingPopup';
import FilmReelSpinner from '@/components/FilmReelSpinner';
import NotesSection from '@/components/NotesSection';

export default function TVShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [show, setShow] = useState<TVShowDetails | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [id, setId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    params.then(async (p) => {
      setId(p.id);
      try {
        const response = await fetch(`/api/tv/${p.id}`);
        if (response.ok) {
          const data = await response.json();
          setShow(data);
        }
      } catch (error) {
        console.error('Failed to fetch TV show:', error);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  // Fetch user's rating when logged in and show is loaded
  useEffect(() => {
    if (session?.user && show?.id) {
      fetch(`/api/rating?tmdb_id=${show.id}&media_type=tv`)
        .then(res => res.json())
        .then(data => setUserRating(data.rating))
        .catch(err => console.error('Failed to fetch rating:', err));
    }
  }, [session, show?.id]);

  const handleRatingChange = async (rating: number) => {
    if (!show) return;

    const previousRating = userRating;
    setUserRating(rating === 0 ? null : rating);

    try {
      const response = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: show.id,
          media_type: 'tv',
          title: show.name,
          poster_path: show.poster_path,
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
      <FilmReelSpinner fullScreen />
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 mb-4">TV show not found</h1>
          <Link href="/discover" className="text-blue-500 hover:underline">
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const creator = show.credits?.crew.find((person) => person.job === 'Executive Producer');
  const mainCast = show.credits?.cast.slice(0, 10) || [];
  const tmdbRating = show.vote_average.toFixed(1);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Hero Poster */}
      <div className="relative w-full aspect-[2/3] max-h-[70vh]">
        <Image
          src={getImageUrl(show.poster_path)}
          alt={show.name}
          fill
          className="object-cover"
          priority
        />

        {/* Gradient fade at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

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
          {show.vote_average > 0 && (
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
        <h1 className="text-2xl font-bold">{show.name}</h1>

        {/* Genres */}
        {show.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {show.genres.slice(0, 4).map((genre) => (
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
          {show.overview || 'No overview available.'}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-2">
          {show.first_air_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(show.first_air_date).getFullYear()}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Tv className="w-4 h-4" />
            <span>{show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}</span>
          </div>
          {creator && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Creator</span>
              <span>{creator.name}</span>
            </div>
          )}
        </div>

        {/* Cast */}
        {mainCast.length > 0 && (
          <div className="pt-4 -mx-4">
            <h2 className="text-lg font-semibold mb-3 px-4">Cast</h2>
            <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-3 px-4">
                {mainCast.map((actor) => (
                  <div
                    key={actor.id}
                    className="flex-shrink-0 snap-start text-center"
                    style={{ width: 'calc(28% - 6px)' }}
                  >
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
                <div className="flex-shrink-0 w-1" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <NotesSection
          tmdbId={show.id}
          mediaType="tv"
          isLoggedIn={!!session?.user}
        />
      </div>

      {/* Bottom Sheet */}
      <MediaOptionsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={show.name}
        posterPath={getImageUrl(show.poster_path)}
        mediaType="tv"
        mediaId={show.id}
      />
    </div>
  );
}
