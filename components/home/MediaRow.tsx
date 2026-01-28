'use client';

/**
 * MediaRow - A horizontal scrolling row for library items
 *
 * Use this for displaying user's library items like Continue Watching, Watchlist, etc.
 * Shows 2.5 items visible at once (40% width each), swipeable to see more.
 * Displays the 5 most recent items with dotted placeholders if below 5.
 *
 * For discovery/browse content, use TrendingRow instead (includes add buttons).
 */

import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Plus, Clock, Play, CheckCircle2 } from 'lucide-react';
import { useWatchProviders } from '@/hooks/useWatchProviders';
import StreamingServiceIcon, { STREAMING_ICONS } from '@/components/icons/StreamingServiceIcons';
import { MediaTypeBadge } from '@/components/icons/MediaTypeIcons';

// Status icon mapping - these items are already in library, show which list they're on
const STATUS_ICONS: Record<string, { icon: typeof Clock }> = {
  watchlist: { icon: Clock },
  watching: { icon: Play },
  watched: { icon: CheckCircle2 },
  finished: { icon: CheckCircle2 },
};

export interface MediaRowItem {
  id: number;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

interface MediaRowProps {
  title: string;
  items: MediaRowItem[];
  seeAllHref?: string;
  maxItems?: number;
  minItems?: number;
  addHref?: string;
  status?: 'watchlist' | 'watching' | 'watched' | 'finished'; // Which list these items are in
  showProviders?: boolean;
}

export default function MediaRow({
  title,
  items,
  seeAllHref,
  maxItems = 5,
  minItems = 5,
  addHref = "/search",
  status,
  showProviders = true,
}: MediaRowProps) {
  const displayItems = items.slice(0, maxItems);
  const placeholderCount = Math.max(0, minItems - displayItems.length);

  // Fetch providers for items in this row
  const { getProviders } = useWatchProviders(
    displayItems.map(item => ({ id: item.media_id, media_type: item.media_type })),
    showProviders && displayItems.length > 0
  );

  // Get status icon config
  const statusConfig = status ? STATUS_ICONS[status] : null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {items.length > 0 && seeAllHref && (
          <Link href={seeAllHref} className="text-sm text-gray-400 hover:text-white">
            See all
          </Link>
        )}
      </div>

      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
        <div className="flex gap-3 px-4">
          {displayItems.map((item) => {
            // Filter to only providers we have icons for
            const itemProviders = showProviders
              ? getProviders(item.media_id, item.media_type).filter(p => STREAMING_ICONS[p.provider_id])
              : [];

            return (
              <div
                key={`${item.media_type}-${item.media_id}`}
                className="group flex-shrink-0 snap-start relative"
                style={{ width: 'calc(40% - 6px)' }}
              >
                <Link href={`/${item.media_type}/${item.media_id}`}>
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                    {item.poster_path ? (
                      <Image
                        src={getImageUrl(item.poster_path)}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:opacity-75 transition"
                        sizes="40vw"
                      />
                    ) : (
                      <Image
                        src="/placeholders/place-holder-1.jpg"
                        alt={item.title}
                        fill
                        className="object-cover group-hover:opacity-75 transition"
                        sizes="40vw"
                      />
                    )}

                    {/* Media type badge - Top Left */}
                    <MediaTypeBadge mediaType={item.media_type} className="absolute top-2 left-2" />

                    {/* Status icon - Top Right */}
                    {statusConfig && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <statusConfig.icon className="w-3.5 h-3.5 text-white" />
                      </div>
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
                  <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                </Link>
              </div>
            );
          })}

          {/* Placeholder items for empty slots */}
          {Array.from({ length: placeholderCount }).map((_, index) => (
            <Link
              key={`placeholder-${index}`}
              href={addHref}
              className="group flex-shrink-0 snap-start"
              style={{ width: 'calc(40% - 6px)' }}
            >
              <div className="relative aspect-[2/3] rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 mb-2 flex items-center justify-center transition">
                <Plus className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition" />
              </div>
              <p className="text-sm text-zinc-600 group-hover:text-zinc-400 text-center transition">Add more</p>
            </Link>
          ))}

          <div className="flex-shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
