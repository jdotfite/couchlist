'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Movie, TVShow } from '@/types';
import { Calendar, Star } from 'lucide-react';

interface SearchResultsProps {
  results: (Movie | TVShow)[];
  isLoading: boolean;
}

export default function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-gray-400">No results found</p>
        <p className="text-sm text-gray-500 mt-2">Try searching for something else</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {results.map((item) => {
        const isMovie = 'title' in item;
        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const mediaType = isMovie ? 'movie' : 'tv';
        const href = `/${mediaType}/${item.id}`;

        return (
          <Link
            key={item.id}
            href={href}
            className="group cursor-pointer transition-transform hover:scale-105"
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] mb-3 overflow-hidden rounded-lg bg-gray-800">
              <Image
                src={getImageUrl(item.poster_path)}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="text-sm text-gray-300 line-clamp-4">{item.overview || 'No description available.'}</p>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-1">
              {/* Title */}
              <h3 className="font-semibold text-white line-clamp-2 leading-snug">
                {title}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center gap-3 text-sm text-gray-400">
                {/* Rating */}
                {item.vote_average > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>{item.vote_average.toFixed(1)}</span>
                  </div>
                )}

                {/* Year */}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{year}</span>
                </div>

                {/* Type Badge */}
                <span className="px-2 py-0.5 bg-gray-700 rounded text-xs uppercase">
                  {isMovie ? 'Movie' : 'TV'}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
