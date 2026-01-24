'use client';

import { LucideIcon } from 'lucide-react';
import { IconCircle } from './IconCircle';
import { ReactNode } from 'react';

type StateDisplayVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'brand';

interface StateDisplayProps {
  icon: LucideIcon;
  variant?: StateDisplayVariant;
  title: string;
  message?: ReactNode;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonVariant?: 'primary' | 'danger' | 'secondary';
  buttonDisabled?: boolean;
  children?: ReactNode;
  className?: string;
}

const buttonStyles = {
  primary: 'bg-brand-primary hover:bg-brand-primary-dark',
  danger: 'bg-red-500 hover:bg-red-600',
  secondary: 'bg-zinc-800 hover:bg-zinc-700',
};

/**
 * A reusable state display component for success, error, empty, and info states.
 * Combines IconCircle with title, message, and optional action button.
 */
export function StateDisplay({
  icon,
  variant = 'neutral',
  title,
  message,
  buttonText,
  onButtonClick,
  buttonVariant = 'primary',
  buttonDisabled = false,
  children,
  className = '',
}: StateDisplayProps) {
  return (
    <div className={`text-center py-6 ${className}`}>
      <div className="flex justify-center mb-4">
        <IconCircle icon={icon} variant={variant} size="lg" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {message && (
        <p className="text-gray-400 text-sm mb-4 max-w-xs mx-auto">{message}</p>
      )}
      {children}
      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          disabled={buttonDisabled}
          className={`w-full py-3 ${buttonStyles[buttonVariant]} rounded-xl font-semibold transition disabled:opacity-50`}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

export default StateDisplay;
