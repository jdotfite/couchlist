'use client';

/**
 * TrendingRow - A horizontal scrolling row for discovery/browse content (2.5-up layout)
 *
 * Use this for displaying trending, popular, or recommended content with optional add buttons.
 * Shows larger items (~2.5 visible at a time) for better discoverability.
 *
 * For user's library items, use MediaRow instead (compact 3-up layout with placeholders).
 */

import Link from 'next/link';
import Image from 'next/image';
import { Plus, Film, Tv } from 'lucide-react';
import { useWatchProviders } from '@/hooks/useWatchProviders';
import StreamingServiceIcon, { STREAMING_ICONS } from '@/components/icons/StreamingServiceIcons';

export interface TrendingRowItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
}

interface TrendingRowProps {
  title: string;
  items: TrendingRowItem[];
  seeAllHref?: string;
  onAddClick?: (item: TrendingRowItem) => void;
  showProviders?: boolean;
}

export default function TrendingRow({ title, items, seeAllHref, onAddClick, showProviders = true }: TrendingRowProps) {
  // Fetch providers for items in this row
  const { getProviders } = useWatchProviders(
    items.map(item => ({ id: item.id, media_type: item.media_type })),
    showProviders && items.length > 0
  );

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-sm text-gray-400 hover:text-white">
            See all
          </Link>
        )}
      </div>
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
        <div className="flex gap-3 px-4">
          {items.map((item) => {
            const displayTitle = item.title || item.name || 'Unknown';
            const year = (item.release_date || item.first_air_date)?.split('-')[0];
            const href = `/${item.media_type}/${item.id}`;
            // Filter to only providers we have icons for
            const itemProviders = showProviders
              ? getProviders(item.id, item.media_type).filter(p => STREAMING_ICONS[p.provider_id])
              : [];

            return (
              <Link
                key={`${item.media_type}-${item.id}`}
                href={href}
                className="group flex-shrink-0 snap-start"
                style={{ width: 'calc(40% - 6px)' }}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                  {item.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={displayTitle}
                      fill
                      className="object-cover group-hover:opacity-75 transition"
                      sizes="40vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}

                  {/* Media type badge */}
                  <div className="absolute top-2 left-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                    {item.media_type === 'movie' ? (
                      <Film className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Tv className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>

                  {onAddClick && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddClick(item);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Provider Icons Row - Bottom */}
                  {itemProviders.length > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                      {itemProviders.slice(0, 3).map((provider) => (
                        <StreamingServiceIcon
                          key={provider.provider_id}
                          providerId={provider.provider_id}
                          size={20}
                          showBackground
                        />
                      ))}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">{displayTitle}</h3>
                {year && <p className="text-xs text-gray-400">{year}</p>}
              </Link>
            );
          })}
          <div className="flex-shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
