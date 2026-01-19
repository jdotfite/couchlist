'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Film,
  Tv,
  Search,
  CheckCircle2,
  Clock,
  Play,
  PauseCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  Heart,
  Plus
} from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  iconType?: 'search' | 'movie' | 'tv' | 'finished' | 'watchlist' | 'watching' | 'onhold' | 'dropped' | 'rewatch' | 'classics' | 'favorites' | 'generic';
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

const iconMap = {
  search: <Search className="w-12 h-12" />,
  movie: <Film className="w-12 h-12" />,
  tv: <Tv className="w-12 h-12" />,
  finished: <CheckCircle2 className="w-12 h-12" />,
  watchlist: <Clock className="w-12 h-12" />,
  watching: <Play className="w-12 h-12" />,
  onhold: <PauseCircle className="w-12 h-12" />,
  dropped: <XCircle className="w-12 h-12" />,
  rewatch: <RotateCcw className="w-12 h-12" />,
  classics: <Sparkles className="w-12 h-12" />,
  favorites: <Heart className="w-12 h-12" />,
  generic: <Film className="w-12 h-12" />,
};

const iconColorMap = {
  search: 'text-text-muted',
  movie: 'text-pink-500',
  tv: 'text-teal-500',
  finished: 'text-brand-primary',
  watchlist: 'text-blue-500',
  watching: 'text-green-500',
  onhold: 'text-yellow-500',
  dropped: 'text-red-500',
  rewatch: 'text-cyan-500',
  classics: 'text-amber-500',
  favorites: 'text-pink-500',
  generic: 'text-text-muted',
};

export default function EmptyState({
  icon,
  iconType = 'generic',
  title,
  subtitle,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const displayIcon = icon || iconMap[iconType];
  const iconColor = iconColorMap[iconType];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon Container */}
      <div className={`mb-4 ${iconColor} opacity-60`}>
        {displayIcon}
      </div>

      {/* Text Content */}
      <h3 className="text-lg font-semibold text-text-primary mb-1 text-center">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-text-muted text-center max-w-xs">
          {subtitle}
        </p>
      )}

      {/* Action Button */}
      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white rounded-full font-semibold text-sm transition"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white rounded-full font-semibold text-sm transition"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
