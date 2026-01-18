'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Movie, TVShow } from '@/types';
import { Star, Plus } from 'lucide-react';
import MediaOptionsSheet from './MediaOptionsSheet';

interface SearchResultsProps {
  results: (Movie | TVShow)[];
  isLoading: boolean;
}

export default function SearchResults({ results, isLoading }: SearchResultsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(Movie | TVShow) | null>(null);

  const handleAddClick = (e: React.MouseEvent, item: Movie | TVShow) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-zinc-800 rounded-lg mb-2"></div>
            <div className="h-4 bg-zinc-800 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-400">No results found</p>
        <p className="text-sm text-gray-500 mt-1">Try a different search</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {results.map((item) => {
          const isMovie = 'title' in item;
          const title = isMovie ? item.title : item.name;
          const releaseDate = isMovie ? item.release_date : item.first_air_date;
          const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
          const mediaType = isMovie ? 'movie' : 'tv';
          const href = `/${mediaType}/${item.id}`;

          return (
            <div key={item.id} className="group relative">
              <Link href={href}>
                {/* Poster */}
                <div className="relative aspect-[2/3] mb-2 overflow-hidden rounded-lg bg-zinc-800">
                  <Image
                    src={getImageUrl(item.poster_path)}
                    alt={title}
                    fill
                    className="object-cover group-hover:opacity-75 transition"
                    sizes="50vw"
                  />
                  
                  {/* Rating Badge - Top Left */}
                  {item.vote_average > 0 && (
                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      <span className="text-xs font-semibold">{item.vote_average.toFixed(1)}</span>
                    </div>
                  )}

                  {/* Plus Button - Top Right */}
                  <button
                    onClick={(e) => handleAddClick(e, item)}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Info */}
                <div className="space-y-1">
                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                    {title}
                  </h3>

                  {/* Meta Info */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{year}</span>
                    <span>•</span>
                    <span className="uppercase">{isMovie ? 'Movie' : 'TV'}</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title={'title' in selectedItem ? selectedItem.title : selectedItem.name}
          posterPath={getImageUrl(selectedItem.poster_path)}
          mediaType={'title' in selectedItem ? 'movie' : 'tv'}
          mediaId={selectedItem.id}
        />
      )}
    </>
  );
}
