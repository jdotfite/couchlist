'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Movie, TVShow } from '@/types';
import { Star, Plus } from 'lucide-react';
import MediaOptionsSheet from './MediaOptionsSheet';
import EmptyState from './EmptyState';
import StreamingServiceIcon, { STREAMING_ICONS } from './icons/StreamingServiceIcons';
import { useWatchProviders } from '@/hooks/useWatchProviders';
import { TOP_US_PROVIDERS } from '@/types/streaming';

interface SearchResultsProps {
  results: (Movie | TVShow)[];
  isLoading: boolean;
  activeProvider?: number; // Provider ID when filtering by a specific service
}

export default function SearchResults({ results, isLoading, activeProvider }: SearchResultsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(Movie | TVShow) | null>(null);

  // Fetch providers for results (only when not filtering by a specific provider)
  const { getProviders, isLoading: providersLoading } = useWatchProviders(
    results,
    !activeProvider && results.length > 0
  );

  const handleAddClick = (e: React.MouseEvent, item: Movie | TVShow) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  // Get the active provider name for display
  const activeProviderInfo = activeProvider
    ? TOP_US_PROVIDERS.find(p => p.provider_id === activeProvider)
    : null;

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
      <EmptyState
        iconType="search"
        title="No results found"
        subtitle="Try a different search term or browse categories"
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {results.map((item) => {
          // Check for explicit media_type first (from discover results), then infer from fields
          const itemWithType = item as typeof item & { media_type?: 'movie' | 'tv' };
          const mediaType = itemWithType.media_type || ('title' in item && !('name' in item) ? 'movie' : 'tv');
          const isMovie = mediaType === 'movie';
          const title = 'title' in item ? item.title : (item as TVShow).name;
          const releaseDate = isMovie ? (item as Movie).release_date : (item as TVShow).first_air_date;
          const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
          const href = `/${mediaType}/${item.id}`;

          // Get providers for this item (filter to only ones we have icons for)
          const itemProviders = activeProvider
            ? [] // When filtering by provider, we show the active provider badge instead
            : getProviders(item.id, mediaType).filter(p => STREAMING_ICONS[p.provider_id]);

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
                    className="absolute top-2 right-2 w-6 h-6 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Active Provider Badge - Bottom Left (when filtering by provider) */}
                  {activeProvider && (
                    <div className="absolute bottom-2 left-2">
                      <StreamingServiceIcon
                        providerId={activeProvider}
                        size={24}
                        showBackground
                      />
                    </div>
                  )}

                  {/* Provider Icons Row - Bottom (when not filtering) */}
                  {!activeProvider && itemProviders.length > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                      {itemProviders.slice(0, 4).map((provider) => (
                        <StreamingServiceIcon
                          key={provider.provider_id}
                          providerId={provider.provider_id}
                          size={22}
                          showBackground
                        />
                      ))}
                    </div>
                  )}
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
