'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MoreVertical, Heart, Star, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';
import { getGenreNames } from '@/lib/genres';

export interface MediaCardItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  genre_ids?: string | null;
  release_year?: number | null;
  added_date?: string;
  watched_date?: string;
  rating?: number;
  is_favorite?: boolean;
  owner_id?: number;
  added_by?: number;
  added_by_name?: string;
}

interface MediaCardProps {
  item: MediaCardItem;
  onOptionsClick?: () => void;
  variant?: 'grid' | 'list';
  currentUserId?: number;
}

export default function MediaCard({ item, onOptionsClick, variant = 'grid', currentUserId }: MediaCardProps) {
  const href = `/${item.media_type}/${item.media_id}`;

  // Show "Added by" when item was added by someone other than current user
  const showAddedBy = currentUserId && item.added_by && item.added_by !== currentUserId && item.added_by_name;

  // Get genre names (limit to 2)
  const genres = getGenreNames(item.genre_ids, 2);

  if (variant === 'list') {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition group">
        <Link
          href={href}
          className="relative w-12 h-[68px] flex-shrink-0 rounded-md overflow-hidden bg-zinc-800"
        >
          <Image
            src={getImageUrl(item.poster_path)}
            alt={item.title}
            fill
            className="object-cover"
            sizes="48px"
          />
        </Link>

        <Link href={href} className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {item.rating && (
              <div className="flex items-center gap-1 text-xs text-yellow-400">
                <Star className="w-3 h-3 fill-yellow-400" />
                {item.rating}
              </div>
            )}
            {genres.length > 0 && (
              <span className="text-xs text-gray-500">{genres.join(' · ')}</span>
            )}
            {showAddedBy && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>{item.added_by_name}</span>
              </div>
            )}
          </div>
        </Link>

        {item.is_favorite && (
          <Heart className="w-5 h-5 fill-pink-500 text-pink-500 flex-shrink-0" />
        )}

        {onOptionsClick && (
          <button
            onClick={onOptionsClick}
            className="p-2 text-gray-400 hover:text-white transition"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  // Grid variant - overlay style
  return (
    <div className="group relative">
      <Link href={href}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
          <Image
            src={getImageUrl(item.poster_path)}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="50vw"
          />

          {/* Gradient overlay - always visible but subtle, stronger on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

          {/* Genre badges at top */}
          {genres.length > 0 && (
            <div className="absolute top-2 left-2 flex gap-1 z-10">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] text-gray-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Content overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight text-white drop-shadow-lg">
              {item.title}
            </h3>

            <div className="flex items-center gap-2 mt-1">
              {item.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">{item.rating}</span>
                </div>
              )}
              {showAddedBy && (
                <div className="flex items-center gap-0.5 text-gray-400">
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{item.added_by_name}</span>
                </div>
              )}
              {item.is_favorite && (
                <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 ml-auto" />
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Options button - top right */}
      {onOptionsClick && (
        <button
          onClick={onOptionsClick}
          className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100 z-10"
        >
          <MoreVertical className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  );
}
