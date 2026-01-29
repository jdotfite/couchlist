import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

interface UseLongPressReturn {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (x: number, y: number) => {
      isLongPressRef.current = false;
      startPosRef.current = { x, y };

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
        // Vibrate on supported devices
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (shouldClick = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (shouldClick && !isLongPressRef.current && onClick) {
        onClick();
      }

      startPosRef.current = null;
    },
    [onClick]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start(touch.clientX, touch.clientY);
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Prevent click if it was a long press
      if (isLongPressRef.current) {
        e.preventDefault();
      }
      clear(!isLongPressRef.current);
    },
    [clear]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel if moved more than 10px
      if (startPosRef.current && timerRef.current) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startPosRef.current.x);
        const dy = Math.abs(touch.clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) {
          clear(false);
        }
      }
    },
    [clear]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left click
      if (e.button !== 0) return;
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      clear(!isLongPressRef.current);
    },
    [clear]
  );

  const onMouseLeave = useCallback(() => {
    clear(false);
  }, [clear]);

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
  };
}
