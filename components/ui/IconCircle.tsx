'use client';

import { LucideIcon } from 'lucide-react';

type IconCircleVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand';
type IconCircleSize = 'sm' | 'md' | 'lg';

interface IconCircleProps {
  icon: LucideIcon;
  variant?: IconCircleVariant;
  size?: IconCircleSize;
  className?: string;
}

const variantStyles: Record<IconCircleVariant, string> = {
  success: 'bg-green-500/20',
  danger: 'bg-red-500/20',
  warning: 'bg-amber-500/20',
  info: 'bg-blue-500/20',
  neutral: 'bg-zinc-800',
  brand: 'bg-brand-primary/20',
};

const sizeStyles: Record<IconCircleSize, { container: string; icon: string }> = {
  sm: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  lg: { container: 'w-16 h-16', icon: 'w-8 h-8' },
};

/**
 * A circular container for icons with consistent styling.
 * Icons are always white for proper contrast on colored backgrounds.
 */
export function IconCircle({
  icon: Icon,
  variant = 'neutral',
  size = 'lg',
  className = '',
}: IconCircleProps) {
  const { container, icon } = sizeStyles[size];
  const bgStyle = variantStyles[variant];

  return (
    <div
      className={`${container} ${bgStyle} rounded-full flex items-center justify-center ${className}`}
    >
      <Icon className={`${icon} text-white`} />
    </div>
  );
}

export default IconCircle;
