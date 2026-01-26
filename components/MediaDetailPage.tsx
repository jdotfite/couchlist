'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MovieDetails, TVShowDetails } from '@/types';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Calendar, Clock, Tv, ArrowLeft, Plus, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';
import StarRatingPopup from '@/components/StarRatingPopup';
import NotesSection from '@/components/NotesSection';
import WatchProviders from '@/components/WatchProviders';
import TVProgressSection from '@/components/episodes/TVProgressSection';
import ShowAlertToggle from '@/components/tv/ShowAlertToggle';

type MediaDetails = MovieDetails | TVShowDetails;

interface MediaDetailPageProps {
  mediaType: 'movie' | 'tv';
  id: string;
}

function isMovie(media: MediaDetails): media is MovieDetails {
  return 'title' in media;
}

export default function MediaDetailPage({ mediaType, id }: MediaDetailPageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [media, setMedia] = useState<MediaDetails | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(`/api/${mediaType}/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMedia(data);
        }
      } catch (error) {
        console.error(`Failed to fetch ${mediaType}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [mediaType, id]);

  // Fetch user's rating and library status when logged in and media is loaded
  useEffect(() => {
    if (session?.user && media?.id) {
      // Fetch rating
      fetch(`/api/rating?tmdb_id=${media.id}&media_type=${mediaType}`)
        .then(res => res.json())
        .then(data => setUserRating(data.rating))
        .catch(err => console.error('Failed to fetch rating:', err));

      // Fetch library status
      fetch(`/api/media-status?tmdb_id=${media.id}&media_type=${mediaType}`)
        .then(res => res.json())
        .then(data => setLibraryStatus(data.status || null))
        .catch(err => console.error('Failed to fetch library status:', err));
    }
  }, [session, media?.id, mediaType]);

  const handleRatingChange = async (rating: number) => {
    if (!media) return;

    const previousRating = userRating;
    setUserRating(rating === 0 ? null : rating);

    const title = isMovie(media) ? media.title : media.name;

    try {
      const response = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: media.id,
          media_type: mediaType,
          title,
          poster_path: media.poster_path,
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
      <div className="min-h-screen bg-black text-white pb-24">
        <div className="w-full aspect-[2/3] max-h-[70vh] bg-zinc-900 animate-pulse" />
        <div className="px-4 pt-4 space-y-3">
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 mb-4">
            {mediaType === 'movie' ? 'Movie' : 'TV show'} not found
          </h1>
          <Link href="/search" className="text-blue-500 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const title = isMovie(media) ? media.title : media.name;
  const releaseDate = isMovie(media) ? media.release_date : media.first_air_date;
  const crew = media.credits?.crew || [];

  // Movie: Director, TV: Executive Producer (creator)
  const keyPerson = isMovie(media)
    ? crew.find((person) => person.job === 'Director')
    : crew.find((person) => person.job === 'Executive Producer');

  const mainCast = media.credits?.cast.slice(0, 10) || [];
  const tmdbRating = media.vote_average.toFixed(1);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Hero Poster */}
      <div className="relative w-full aspect-[2/3] max-h-[70vh]">
        <Image
          src={getImageUrl(media.poster_path)}
          alt={title}
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
            {libraryStatus ? (
              <MoreVertical className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Content Below Poster */}
      <div className="px-4 pt-2 space-y-3">
        {/* Ratings Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {media.vote_average > 0 && (
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
        <h1 className="text-2xl font-bold">{title}</h1>

        {/* Genres */}
        {media.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {media.genres.slice(0, 4).map((genre) => (
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
          {media.overview || 'No overview available.'}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 pt-2">
          {releaseDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(releaseDate).getFullYear()}</span>
            </div>
          )}

          {/* Movie: Runtime, TV: Seasons */}
          {isMovie(media) ? (
            media.runtime > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{Math.floor(media.runtime / 60)}h {media.runtime % 60}m</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5">
              <Tv className="w-4 h-4" />
              <span>{media.number_of_seasons} Season{media.number_of_seasons !== 1 ? 's' : ''}</span>
            </div>
          )}

          {keyPerson && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">
                {isMovie(media) ? 'Director' : 'Creator'}
              </span>
              <span>{keyPerson.name}</span>
            </div>
          )}
        </div>

        {/* Show Alerts Toggle - TV only */}
        {!isMovie(media) && session?.user && (
          <div className="pt-2">
            <ShowAlertToggle
              mediaId={media.id}
              showTitle={media.name}
              isLoggedIn={!!session?.user}
            />
          </div>
        )}

        {/* Episode Tracking - TV only */}
        {!isMovie(media) && (
          <TVProgressSection
            tmdbId={media.id}
            numberOfSeasons={media.number_of_seasons}
            numberOfEpisodes={media.number_of_episodes}
            showTitle={media.name}
            posterPath={media.poster_path}
            isLoggedIn={!!session?.user}
          />
        )}

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

        {/* Watch Providers */}
        <WatchProviders
          providers={media['watch/providers']?.results?.US}
          tmdbLink={media['watch/providers']?.results?.US?.link}
        />

        {/* Notes Section */}
        <NotesSection
          tmdbId={media.id}
          mediaType={mediaType}
          isLoggedIn={!!session?.user}
        />
      </div>

      {/* Bottom Sheet */}
      <MediaOptionsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={title}
        posterPath={getImageUrl(media.poster_path)}
        mediaType={mediaType}
        mediaId={media.id}
        genreIds={media.genres.map(g => g.id)}
        releaseYear={releaseDate ? new Date(releaseDate).getFullYear() : null}
        currentStatus={libraryStatus}
        onStatusChange={(newStatus) => setLibraryStatus(newStatus)}
        onRemove={() => setLibraryStatus(null)}
      />
    </div>
  );
}
