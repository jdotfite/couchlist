'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { X, Plus, Sparkles, TrendingUp, Clock, Settings, LogOut } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const { isOpen, setIsOpen } = useSidebar();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the sidebar container for hydration consistency
  // but only show content after mount and if user is logged in
  const showContent = mounted && session?.user;

  const getInitials = () => {
    const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const userInitials = getInitials();
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Use consistent classes for SSR - only apply transform after mount
  const shouldShow = mounted && isOpen;

  return (
    <div
      className={`fixed top-0 left-0 bottom-0 w-[280px] bg-zinc-900 z-50 transform transition-transform duration-300 ease-out ${
        shouldShow ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {showContent && (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
              {userInitials}
            </div>
            <div>
              <h2 className="text-lg">{userName}</h2>
              <Link href="/profile" onClick={() => setIsOpen(false)} className="text-sm text-gray-400 hover:text-white">
                View profile
              </Link>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="px-6 pb-4">
          <p className="text-2xl font-bold">{getGreeting()}</p>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <Link
            href="/library"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Your Library</span>
          </Link>

          <Link
            href="/add"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Quick Add</span>
          </Link>

          <Link
            href="/browse/trending"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">What's Trending</span>
          </Link>

          <Link
            href="/library/finished"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Clock className="w-5 h-5" />
            <span className="font-medium">Recently Finished</span>
          </Link>

          <div className="border-t border-zinc-800 my-2" />

          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>

          <button
            onClick={() => {
              setIsOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition text-left"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </button>
        </nav>
      </div>
      )}
    </div>
  );
}
