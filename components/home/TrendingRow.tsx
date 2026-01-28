'use client';

/**
 * TrendingRow - A horizontal scrolling row for discovery/browse content (2.5-up layout)
 *
 * Use this for displaying trending, popular, or recommended content with optional add buttons.
 * Shows larger items (~2.5 visible at a time) for better discoverability.
 *
 * For user's library items, use MediaRow instead (compact 3-up layout with placeholders).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Clock, Play, CheckCircle2 } from 'lucide-react';
import { useWatchProviders } from '@/hooks/useWatchProviders';
import { useLibraryStatusBatch } from '@/hooks/useLibraryStatusBatch';
import StreamingServiceIcon, { STREAMING_ICONS } from '@/components/icons/StreamingServiceIcons';
import { MediaTypeBadge } from '@/components/icons/MediaTypeIcons';

// Status icon mapping for in-library items
const STATUS_ICONS: Record<string, { icon: typeof Clock; colorClass: string }> = {
  watchlist: { icon: Clock, colorClass: 'bg-blue-600' },
  watching: { icon: Play, colorClass: 'bg-green-600' },
  watched: { icon: CheckCircle2, colorClass: 'bg-brand-primary' },
  finished: { icon: CheckCircle2, colorClass: 'bg-brand-primary' },
};

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
  // Track local status updates (for immediate feedback after adding)
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // Fetch providers for items in this row
  const { getProviders } = useWatchProviders(
    items.map(item => ({ id: item.id, media_type: item.media_type })),
    showProviders && items.length > 0
  );

  // Fetch library status for items
  const { getStatus } = useLibraryStatusBatch(items, items.length > 0);

  // Helper to get combined status (local override or fetched)
  const getCombinedStatus = (id: number, mediaType: 'movie' | 'tv'): string | null => {
    const key = `${mediaType}-${id}`;
    return localStatuses[key] || getStatus(id, mediaType);
  };

  // Update local status when item is added
  const handleAddClick = (item: TrendingRowItem) => {
    if (onAddClick) {
      onAddClick(item);
      // Optimistically set to watchlist (most common default)
      const key = `${item.media_type}-${item.id}`;
      setLocalStatuses(prev => ({ ...prev, [key]: 'watchlist' }));
    }
  };

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
                  <MediaTypeBadge mediaType={item.media_type} className="absolute top-2 left-2" />

                  {onAddClick && (() => {
                    const status = getCombinedStatus(item.id, item.media_type);
                    const statusConfig = status ? STATUS_ICONS[status] : null;

                    if (statusConfig) {
                      // Item is in library - show white status icon
                      const StatusIconComponent = statusConfig.icon;
                      return (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                          <StatusIconComponent className="w-3.5 h-3.5 text-white" />
                        </div>
                      );
                    }

                    // Item not in library - show add button
                    return (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddClick(item);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}

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
