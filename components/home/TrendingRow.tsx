'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus, Film, Tv } from 'lucide-react';

interface TrendingItem {
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
  items: TrendingItem[];
  seeAllLink?: string;
  onAddClick?: (item: TrendingItem) => void;
}

export default function TrendingRow({ title, items, seeAllLink, onAddClick }: TrendingRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {seeAllLink && (
          <Link href={seeAllLink} className="text-sm text-gray-400 hover:text-white">
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
                      className="absolute top-2 right-2 w-8 h-8 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
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
