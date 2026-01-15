'use client';

import { useState, useEffect } from 'react';
import { TVShowDetails } from '@/types';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Calendar, Tv, Star, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import AddToListSheet from '@/components/AddToListSheet';

export default function TVShowPage({ params }: { params: Promise<{ id: string }> }) {
  const [show, setShow] = useState<TVShowDetails | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [id, setId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

  const handleAddToWatchlist = () => {
    console.log('Added to watchlist:', show?.name);
    // TODO: Implement database action
  };

  const handleMarkAsWatched = () => {
    console.log('Marked as watched:', show?.name);
    // TODO: Implement database action
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">TV show not found</h1>
          <Link href="/search" className="text-blue-500 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const creator = show.credits?.crew.find((person) => person.job === 'Executive Producer');
  const mainCast = show.credits?.cast.slice(0, 6) || [];
  const imdbRating = show.vote_average.toFixed(1);
  const reviewCount = show.vote_count;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Hero Poster Section */}
      <div className="relative w-full aspect-[2/3] max-h-[85vh]">
        <Image
          src={getImageUrl(show.poster_path)}
          alt={show.name}
          fill
          className="object-cover"
          priority
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        
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

        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className="flex items-center gap-3">
            {show.vote_average > 0 && (
              <>
                <div className="bg-yellow-400 text-black px-2 py-1 rounded font-bold text-xs">
                  IMDb {imdbRating}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{imdbRating}</span>
                  <span className="text-gray-400 text-sm">({reviewCount.toLocaleString()} reviews)</span>
                </div>
              </>
            )}
          </div>

          <h1 className="text-3xl font-bold leading-tight">{show.name}</h1>

          {show.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {show.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre.id}
                  className="px-3 py-1 bg-zinc-800/80 backdrop-blur-sm rounded-full text-sm"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
            {show.overview || 'No overview available.'}
          </p>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          {show.first_air_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(show.first_air_date).getFullYear()}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4" />
            <span>{show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
          <p className="text-gray-300 leading-relaxed">
            {show.overview || 'No overview available.'}
          </p>
        </div>

        {creator && (
          <div>
            <h3 className="text-sm text-gray-400 mb-1">Creator</h3>
            <p className="font-semibold">{creator.name}</p>
          </div>
        )}

        {mainCast.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {mainCast.map((actor) => (
                <div key={actor.id} className="text-center">
                  <div className="relative w-full aspect-[2/3] mb-2 rounded-lg overflow-hidden bg-zinc-900">
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

      <AddToListSheet
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
