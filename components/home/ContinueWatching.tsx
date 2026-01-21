'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Film, Tv } from 'lucide-react';

interface LibraryItem {
  id: number;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
}

interface ContinueWatchingProps {
  items: LibraryItem[];
}

export default function ContinueWatching({ items }: ContinueWatchingProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Continue Watching</h2>
        <Link href="/library?status=watching" className="text-sm text-gray-400 hover:text-white">
          See all
        </Link>
      </div>
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
        <div className="flex gap-3 px-4">
          {items.slice(0, 10).map((item) => (
            <Link
              key={`${item.media_type}-${item.media_id}`}
              href={`/${item.media_type}/${item.media_id}`}
              className="group flex-shrink-0 snap-start"
              style={{ width: 'calc(40% - 6px)' }}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                <Image
                  src={item.poster_path ? getImageUrl(item.poster_path) : '/placeholders/place-holder-1.jpg'}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:opacity-75 transition"
                  sizes="40vw"
                />
                {/* Media type badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                  {item.media_type === 'movie' ? (
                    <Film className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Tv className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
            </Link>
          ))}
          <div className="flex-shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
