'use client';

import { Loader2 } from 'lucide-react';
import TrendingRow, { TrendingRowItem } from '@/components/home/TrendingRow';
import RowKebabMenu from './RowKebabMenu';
import { useDiscoveryRowContent } from '@/hooks/useDiscoveryRowContent';
import { UserDiscoveryRowWithConfig } from '@/types/discovery-rows';

interface DiscoveryRowProps {
  row: UserDiscoveryRowWithConfig;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHide: () => void;
  onAddClick: (item: TrendingRowItem) => void;
}

export default function DiscoveryRow({
  row,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onHide,
  onAddClick,
}: DiscoveryRowProps) {
  const { items, loading, error } = useDiscoveryRowContent(row.rowType);

  // Show skeleton while loading
  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{row.config.label}</h2>
          <RowKebabMenu
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onHide={onHide}
          />
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </section>
    );
  }

  // Show error state
  if (error || items.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{row.config.label}</h2>
          <RowKebabMenu
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onHide={onHide}
          />
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          {error || 'No content available'}
        </div>
      </section>
    );
  }

  // Render the row with a custom header that includes the kebab menu
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{row.config.label}</h2>
        <RowKebabMenu
          isFirst={isFirst}
          isLast={isLast}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onHide={onHide}
        />
      </div>
      <TrendingRowContent items={items} onAddClick={onAddClick} />
    </section>
  );
}

// Separate component for just the content (no header)
function TrendingRowContent({
  items,
  onAddClick,
}: {
  items: TrendingRowItem[];
  onAddClick: (item: TrendingRowItem) => void;
}) {
  return (
    <div
      className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4"
      style={{ scrollPaddingLeft: '1rem' }}
    >
      <div className="flex gap-3 px-4">
        {items.map((item) => {
          const displayTitle = item.title || item.name || 'Unknown';
          const year = (item.release_date || item.first_air_date)?.split('-')[0];
          const href = `/${item.media_type}/${item.id}`;

          return (
            <a
              key={`${item.media_type}-${item.id}`}
              href={href}
              className="group flex-shrink-0 snap-start"
              style={{ width: 'calc(40% - 6px)' }}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2">
                {item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={displayTitle}
                    className="w-full h-full object-cover group-hover:opacity-75 transition"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}

                {/* Media type badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-black/75 backdrop-blur-sm rounded-full flex items-center justify-center">
                  {item.media_type === 'movie' ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddClick(item);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/75 hover:bg-brand-primary backdrop-blur-sm rounded-full flex items-center justify-center transition z-10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">{displayTitle}</h3>
              {year && <p className="text-xs text-gray-400">{year}</p>}
            </a>
          );
        })}
        <div className="flex-shrink-0 w-1" />
      </div>
    </div>
  );
}
