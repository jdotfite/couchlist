'use client';

import { SYSTEM_LIST_MAP, type SystemListConfig } from '@/lib/list-config';
import { Heart, Trash2, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';

type StatusIconSize = 'sm' | 'md' | 'lg';

interface StatusIconProps {
  status: string;
  size?: StatusIconSize;
  className?: string;
}

// Size classes matching library page cards
const SIZE_CLASSES: Record<StatusIconSize, { container: string; icon: string }> = {
  sm: { container: 'w-8 h-8 rounded-md', icon: 'w-4 h-4' },
  md: { container: 'w-10 h-10 rounded-lg', icon: 'w-5 h-5' },
  lg: { container: 'w-12 h-12 rounded-lg', icon: 'w-6 h-6' },
};

// Extended config for non-status icons (favorites, remove, labels, etc.)
const EXTENDED_ICON_CONFIG: Record<string, { icon: typeof Heart; bgColorClass: string }> = {
  favorites: {
    icon: Heart,
    bgColorClass: 'from-red-500 to-red-700',
  },
  'favorites-remove': {
    icon: Heart,
    bgColorClass: 'from-zinc-500 to-zinc-700',
  },
  remove: {
    icon: Trash2,
    bgColorClass: 'from-red-500 to-red-700',
  },
  label: {
    icon: Tag,
    bgColorClass: 'from-blue-500 to-blue-700',
  },
  'label-remove': {
    icon: Tag,
    bgColorClass: 'from-zinc-500 to-zinc-700',
  },
  error: {
    icon: AlertCircle,
    bgColorClass: 'from-red-500 to-red-700',
  },
  success: {
    icon: CheckCircle2,
    bgColorClass: 'from-green-500 to-green-700',
  },
};

/**
 * Reusable status icon component that matches the library page design.
 * Uses the centralized list-config for consistent colors.
 * Icons are always white, backgrounds use gradients.
 */
export default function StatusIcon({ status, size = 'md', className = '' }: StatusIconProps) {
  const sizeClasses = SIZE_CLASSES[size];

  // Check system lists first
  const systemConfig = SYSTEM_LIST_MAP[status] || SYSTEM_LIST_MAP[status === 'watched' ? 'finished' : status];

  if (systemConfig) {
    const Icon = systemConfig.icon;
    return (
      <div className={`${sizeClasses.container} bg-gradient-to-br ${systemConfig.bgColorClass} flex items-center justify-center flex-shrink-0 ${className}`}>
        <Icon className={`${sizeClasses.icon} text-white`} />
      </div>
    );
  }

  // Check extended config
  const extendedConfig = EXTENDED_ICON_CONFIG[status];
  if (extendedConfig) {
    const Icon = extendedConfig.icon;
    return (
      <div className={`${sizeClasses.container} bg-gradient-to-br ${extendedConfig.bgColorClass} flex items-center justify-center flex-shrink-0 ${className}`}>
        <Icon className={`${sizeClasses.icon} text-white`} />
      </div>
    );
  }

  // Fallback
  return (
    <div className={`${sizeClasses.container} bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center flex-shrink-0 ${className}`}>
      <Tag className={`${sizeClasses.icon} text-white`} />
    </div>
  );
}

// Export config for use in other components
export { SYSTEM_LIST_MAP, EXTENDED_ICON_CONFIG };
