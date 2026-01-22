'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { Play, List, CheckCircle2, LayoutGrid, LucideIcon } from 'lucide-react';

interface ListItem {
  slug: string;
  title: string;
  count: number;
  posterPath: string | null;
  icon: LucideIcon;
  color: string;
}

interface ListsGridProps {
  lists: ListItem[];
}

export default function ListsGrid({ lists }: ListsGridProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Your Lists</h2>
        <Link href="/library" className="text-sm text-gray-400 hover:text-white">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {lists.map(({ slug, title, count, posterPath, icon: Icon, color }) => (
          <Link
            key={slug}
            href={slug === 'all' ? '/library' : `/library/${slug}`}
            className="group flex items-center gap-3 bg-zinc-900 rounded-md overflow-hidden hover:bg-zinc-800 transition"
          >
            <div className={`relative w-16 h-16 flex-shrink-0 bg-gradient-to-br ${color}`}>
              {posterPath ? (
                <Image
                  src={getImageUrl(posterPath)}
                  alt={title}
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white/80" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-gray-400">{count} {slug === 'all' ? 'lists' : 'items'}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Export list config for reuse
export const DEFAULT_LISTS = [
  { slug: 'watching', title: 'Watching', icon: Play, color: 'from-emerald-500 to-emerald-900' },
  { slug: 'watchlist', title: 'Watchlist', icon: List, color: 'from-blue-600 to-blue-900' },
  { slug: 'finished', title: 'Watched', icon: CheckCircle2, color: 'from-brand-primary to-brand-primary-darker' },
  { slug: 'all', title: 'All Lists', icon: LayoutGrid, color: 'from-zinc-600 to-zinc-800' },
];
