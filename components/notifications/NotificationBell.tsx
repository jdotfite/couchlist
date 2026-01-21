'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      // Fetch counts from both unified notifications and pending invites
      const [notificationsRes, invitesRes, collabRes] = await Promise.all([
        fetch('/api/notifications/count'),
        fetch('/api/invites/pending?countOnly=true'),
        fetch('/api/collaborators/direct-invites'),
      ]);

      let totalCount = 0;

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        totalCount += data.count || 0;
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        totalCount += data.count || 0;
      }

      if (collabRes.ok) {
        const data = await collabRes.json();
        totalCount += (data.invites || []).length;
      }

      setCount(totalCount);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
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
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
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
