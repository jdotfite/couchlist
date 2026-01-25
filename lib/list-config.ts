import { Clock, Play, CheckCircle2, LucideIcon } from 'lucide-react';

/**
 * Centralized configuration for system lists.
 * This is the single source of truth for list icons, colors, and display names.
 * All components should import from this file to ensure consistency.
 */

export interface SystemListConfig {
  slug: string;
  title: string;
  icon: LucideIcon;
  iconColorClass: string;  // Tailwind color class for icon (e.g., 'text-blue-500')
  bgColorClass: string;    // Tailwind gradient for backgrounds (e.g., 'from-blue-500 to-blue-700')
  bgSolidClass: string;    // Solid background color (e.g., 'bg-blue-500')
}

// Core system lists - ordered: Watchlist → Watching → Watched
export const SYSTEM_LISTS: SystemListConfig[] = [
  {
    slug: 'watchlist',
    title: 'Watchlist',
    icon: Clock,
    iconColorClass: 'text-blue-500',
    bgColorClass: 'from-blue-500 to-blue-700',
    bgSolidClass: 'bg-blue-500',
  },
  {
    slug: 'watching',
    title: 'Watching',
    icon: Play,
    iconColorClass: 'text-green-500',
    bgColorClass: 'from-emerald-500 to-emerald-700',
    bgSolidClass: 'bg-emerald-500',
  },
  {
    slug: 'finished',
    title: 'Watched',
    icon: CheckCircle2,
    iconColorClass: 'text-brand-primary',
    bgColorClass: 'from-purple-500 to-purple-700',
    bgSolidClass: 'bg-purple-500',
  },
];

// Map for quick lookup by slug
export const SYSTEM_LIST_MAP: Record<string, SystemListConfig> = SYSTEM_LISTS.reduce(
  (acc, list) => {
    acc[list.slug] = list;
    return acc;
  },
  {} as Record<string, SystemListConfig>
);

// Helper to get list config by slug
export function getSystemListConfig(slug: string): SystemListConfig | undefined {
  return SYSTEM_LIST_MAP[slug];
}

// Helper to get icon component by slug
export function getSystemListIcon(slug: string): LucideIcon | undefined {
  return SYSTEM_LIST_MAP[slug]?.icon;
}

// Display name mapping (for legacy support)
export const LIST_DISPLAY_NAMES: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  finished: 'Watched',
};
