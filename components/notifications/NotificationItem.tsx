'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface NotificationItemProps {
  children: ReactNode;
  onDismiss?: () => void;
  swipeable?: boolean;
}

const SWIPE_THRESHOLD = 0.3; // 30% of item width triggers dismiss
const VELOCITY_THRESHOLD = 0.5; // Pixels per ms for fast swipe

export default function NotificationItem({
  children,
  onDismiss,
  swipeable = true,
}: NotificationItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!swipeable || !onDismiss) return;

    startXRef.current = e.touches[0].clientX;
    startTimeRef.current = Date.now();
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, [swipeable, onDismiss]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || !swipeable || !onDismiss) return;

    const currentX = e.touches[0].clientX;
    currentXRef.current = currentX;
    const diff = currentX - startXRef.current;

    // Only allow left swipe (negative diff)
    if (diff < 0) {
      // Add resistance as we swipe further
      const resistance = 0.5;
      const adjustedDiff = diff * resistance;
      setTranslateX(Math.max(adjustedDiff, -200));
    } else {
      setTranslateX(0);
    }
  }, [isSwiping, swipeable, onDismiss]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping || !swipeable || !onDismiss || !containerRef.current) {
      setIsSwiping(false);
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const swipeDistance = Math.abs(translateX);
    const swipePercentage = swipeDistance / containerWidth;

    // Calculate velocity
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = Math.abs(currentXRef.current - startXRef.current) / deltaTime;

    // Trigger dismiss if swiped past threshold or fast swipe
    if (swipePercentage > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      setIsDismissing(true);
      setTranslateX(-containerWidth);

      // Call onDismiss after animation completes
      setTimeout(() => {
        onDismiss();
      }, 200);
    } else {
      // Reset position
      setTranslateX(0);
    }

    setIsSwiping(false);
  }, [isSwiping, swipeable, onDismiss, translateX]);

  // Mouse events for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!swipeable || !onDismiss) return;

    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    currentXRef.current = e.clientX;
    setIsSwiping(true);
  }, [swipeable, onDismiss]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSwiping || !swipeable || !onDismiss) return;

    const currentX = e.clientX;
    currentXRef.current = currentX;
    const diff = currentX - startXRef.current;

    if (diff < 0) {
      const resistance = 0.5;
      const adjustedDiff = diff * resistance;
      setTranslateX(Math.max(adjustedDiff, -200));
    } else {
      setTranslateX(0);
    }
  }, [isSwiping, swipeable, onDismiss]);

  const handleMouseUp = useCallback(() => {
    if (!isSwiping) return;
    handleTouchEnd();
  }, [isSwiping, handleTouchEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isSwiping) {
      setTranslateX(0);
      setIsSwiping(false);
    }
  }, [isSwiping]);

  if (!swipeable || !onDismiss) {
    return <div>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
    >
      {/* Dismiss background */}
      <div
        className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center"
        style={{
          opacity: Math.min(Math.abs(translateX) / 80, 1),
        }}
      >
        <Trash2 className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div
        className={`swipe-item ${isSwiping ? 'swiping' : ''} ${isDismissing ? 'dismissing' : ''}`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}
