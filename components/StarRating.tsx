'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number | null;
  onRate?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export default function StarRating({
  rating,
  onRate,
  size = 'md',
  readonly = false,
  showLabel = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating ?? rating ?? 0;

  const handleClick = (value: number) => {
    if (readonly || !onRate) return;
    // If clicking the same rating, clear it
    if (value === rating) {
      onRate(0);
    } else {
      onRate(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (readonly || !onRate) return;
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= displayRating;
          const isInteractive = !readonly && onRate;

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleClick(value)}
              onMouseEnter={() => handleMouseEnter(value)}
              disabled={readonly || !onRate}
              className={`${isInteractive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform disabled:cursor-default`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-zinc-600'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showLabel && rating !== null && rating > 0 && (
        <span className="text-sm text-gray-400 ml-1">
          {rating}/5
        </span>
      )}
    </div>
  );
}
