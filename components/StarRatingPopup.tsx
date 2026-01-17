'use client';

import { useState, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';

interface StarRatingPopupProps {
  rating: number | null;
  onRate: (rating: number) => void;
}

export default function StarRatingPopup({ rating, onRate }: StarRatingPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerPosition, setTriggerPosition] = useState({ top: 0, left: 0 });

  // Calculate trigger position for arrow
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTriggerPosition({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        const popup = document.getElementById('rating-popup');
        if (popup && !popup.contains(event.target as Node)) {
          setIsOpen(false);
          setHoverRating(null);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleStarClick = (value: number) => {
    if (value === rating) {
      onRate(0);
    } else {
      onRate(value);
    }
    setIsOpen(false);
    setHoverRating(null);
  };

  const displayRating = hoverRating ?? rating ?? 0;

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition"
      >
        <Star
          className={`w-4 h-4 ${rating ? 'fill-yellow-400 text-yellow-400' : ''}`}
        />
        <span className="text-sm">
          {rating ? `${rating}/10` : 'Rate'}
        </span>
      </button>

      {/* Popup - horizontally centered, vertically above trigger */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => {
              setIsOpen(false);
              setHoverRating(null);
            }}
          />

          {/* Popup content */}
          <div
            id="rating-popup"
            className="fixed left-1/2 -translate-x-1/2 z-50 bg-zinc-900 rounded-xl p-3 shadow-xl"
            style={{ top: triggerPosition.top - 120 }}
          >
            {/* Arrow pointing down */}
            <div className="absolute top-full left-[20%] -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-zinc-900" />

            <p className="text-xs text-gray-400 mb-2 text-center">What did you think?</p>

            <div
              className="flex items-center gap-0.5"
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
                const isFilled = value <= displayRating;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleStarClick(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onTouchStart={() => setHoverRating(value)}
                    className="cursor-pointer active:scale-110 transition-transform p-0.5"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        isFilled
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-zinc-600'
                      } transition-colors`}
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-center text-sm text-yellow-400 mt-2 font-medium h-5">
              {displayRating > 0 ? `${displayRating}/10` : ''}
            </p>
          </div>
        </>
      )}
    </>
  );
}
