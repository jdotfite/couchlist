'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { X, Home, Search, Library, Users, Settings, LogOut, List, ChevronRight, User } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useProfileImage } from '@/hooks/useProfileImage';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const { isOpen, setIsOpen } = useSidebar();
  const { data: session } = useSession();
  const { profileImage, clearCache } = useProfileImage();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch username when sidebar opens and user is logged in
  useEffect(() => {
    if (isOpen && session?.user) {
      fetch('/api/users/username')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setUsername(data.username);
        })
        .catch(() => {});
    }
  }, [isOpen, session?.user]);

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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div>
              <h2 className="text-lg">{userName}</h2>
              {username ? (
                <span className="text-sm text-gray-400">@{username}</span>
              ) : (
                <Link
                  href="/settings/privacy"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-brand-primary hover:text-brand-primary-light flex items-center gap-1"
                >
                  Set username
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
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
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            href="/search"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Search className="w-5 h-5" />
            <span className="font-medium">Search</span>
          </Link>

          <Link
            href="/library"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Library className="w-5 h-5" />
            <span className="font-medium">Library</span>
          </Link>

          <Link
            href="/lists"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <List className="w-5 h-5" />
            <span className="font-medium">Custom Lists</span>
          </Link>

          <Link
            href="/community"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Community</span>
          </Link>

          <div className="border-t border-zinc-800 my-2" />

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <User className="w-5 h-5" />
            <span className="font-medium">Profile</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>

        {/* Pinned Footer */}
        <div className="px-4 py-4 border-t border-zinc-800">
          <button
            onClick={() => {
              setIsOpen(false);
              clearCache();
              signOut({ callbackUrl: '/' });
            }}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition text-left text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log out</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
