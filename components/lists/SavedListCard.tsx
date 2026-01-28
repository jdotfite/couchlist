'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, List, Star, Heart, Bookmark, Folder, Film, Tv, Trophy, Crown, Flame, Sparkles, Zap, Clock, Calendar, Eye, Play, Check, Flag, Globe } from 'lucide-react';
import { getImageUrl } from '@/lib/tmdb';

interface SavedListCardProps {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  itemCount: number;
  isPublic: boolean;
  previewPosters?: (string | null)[];
}

// Icon mapping
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  list: List,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  folder: Folder,
  film: Film,
  tv: Tv,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  sparkles: Sparkles,
  zap: Zap,
  clock: Clock,
  calendar: Calendar,
  eye: Eye,
  play: Play,
  check: Check,
  flag: Flag,
};

// Color classes
const COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
};

export default function SavedListCard({
  id,
  slug,
  name,
  description,
  icon,
  color,
  itemCount,
  isPublic,
  previewPosters = [],
}: SavedListCardProps) {
  const IconComponent = ICON_COMPONENTS[icon] || List;
  const colorClass = COLOR_CLASSES[color] || 'bg-gray-500';

  return (
    <Link
      href={`/saved-lists/${slug}`}
      className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl overflow-hidden transition group"
    >
      <div className="flex items-center p-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <IconComponent className="w-6 h-6 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 ml-4 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {isPublic && (
              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-400">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Preview Posters */}
        {previewPosters.length > 0 && (
          <div className="flex mr-2">
            {previewPosters.slice(0, 5).map((poster, index) => (
              <div
                key={index}
                className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0"
                style={{
                  zIndex: index,
                  marginLeft: index === 0 ? 0 : -16,
                  boxShadow: index > 0 ? '-3px 0 6px rgba(0, 0, 0, 0.4)' : 'none',
                }}
              >
                {poster ? (
                  <Image
                    src={getImageUrl(poster)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-700" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition flex-shrink-0" />
      </div>
    </Link>
  );
}
