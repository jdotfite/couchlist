'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/summary');
      if (response.ok) {
        const data = await response.json();
        setCount(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // Refetch when tab becomes visible (user switches back to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCount]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Refresh count after closing
    fetchCount();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-zinc-800 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#8b5ef4] text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <NotificationCenter
        isOpen={isOpen}
        onClose={handleClose}
        onCountChange={setCount}
      />
    </>
  );
}
