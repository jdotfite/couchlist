'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface HorizontalScrollRowProps {
  title?: string;
  seeAllHref?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable horizontal scrolling row component.
 * Used for trending movies, cast sections, and other scrollable content.
 *
 * Usage:
 * <HorizontalScrollRow title="Trending Movies" seeAllHref="/discover">
 *   {items.map(item => <YourCard key={item.id} />)}
 * </HorizontalScrollRow>
 */
export default function HorizontalScrollRow({
  title,
  seeAllHref,
  children,
  className = '',
}: HorizontalScrollRowProps) {
  return (
    <section className={`mb-8 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {seeAllHref && (
            <Link href={seeAllHref} className="text-sm text-gray-400 hover:text-white">
              See all
            </Link>
          )}
        </div>
      )}
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4" style={{ scrollPaddingLeft: '1rem' }}>
        <div className="flex gap-3 px-4">
          {children}
          {/* Spacer for scroll padding at end */}
          <div className="flex-shrink-0 w-1" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

interface ScrollItemProps {
  children: ReactNode;
  width?: 'poster' | 'cast' | 'wide';
  className?: string;
}

/**
 * Individual item wrapper for HorizontalScrollRow.
 * Provides consistent sizing and snap behavior.
 */
export function ScrollItem({ children, width = 'poster', className = '' }: ScrollItemProps) {
  const widthStyles = {
    poster: 'calc(40% - 6px)',  // ~2.5 items visible on mobile
    cast: 'calc(28% - 6px)',    // ~3.5 items visible on mobile (for cast photos)
    wide: 'calc(70% - 6px)',    // ~1.5 items visible (for wider cards)
  };

  return (
    <div
      className={`flex-shrink-0 snap-start ${className}`}
      style={{ width: widthStyles[width] }}
    >
      {children}
    </div>
  );
}
