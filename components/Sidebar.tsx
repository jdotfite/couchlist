'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { X, Tv, Film, Compass, Users, Settings, LogOut, Share2, Plus, List } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useEffect, useState } from 'react';
import { getIconComponent } from './custom-lists/IconPicker';
import { getColorValue } from './custom-lists/ColorPicker';

interface CustomList {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  is_shared: boolean;
  item_count?: number;
}

export default function Sidebar() {
  const { isOpen, setIsOpen } = useSidebar();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch custom lists when sidebar opens
  useEffect(() => {
    if (isOpen && session?.user) {
      fetch('/api/custom-lists')
        .then(res => res.json())
        .then(data => setCustomLists(data.lists || []))
        .catch(() => {});
    }
  }, [isOpen, session]);

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
            href="/shows"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Tv className="w-5 h-5" />
            <span className="font-medium">TV Shows</span>
          </Link>

          <Link
            href="/movies"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Film className="w-5 h-5" />
            <span className="font-medium">Movies</span>
          </Link>

          <Link
            href="/discover"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Compass className="w-5 h-5" />
            <span className="font-medium">Discover</span>
          </Link>

          <Link
            href="/community"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Community</span>
          </Link>

          <Link
            href="/settings/collaborators"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 rounded-lg transition"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Shared Lists</span>
          </Link>

          {/* Custom Lists Section */}
          <div className="border-t border-zinc-800 my-2" />

          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wider">My Lists</span>
            <Link
              href="/lists"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-800 rounded transition text-gray-400 hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>

          {customLists.length > 0 ? (
            customLists.slice(0, 5).map((list) => {
              const IconComponent = getIconComponent(list.icon);
              const colorValue = getColorValue(list.color);
              return (
                <Link
                  key={list.slug}
                  href={`/lists/${list.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-800 rounded-lg transition"
                >
                  <IconComponent className="w-5 h-5" style={{ color: colorValue }} />
                  <span className="font-medium flex-1 truncate">{list.name}</span>
                  {list.is_shared && <Users className="w-4 h-4 text-brand-primary" />}
                </Link>
              );
            })
          ) : (
            <Link
              href="/lists"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-800 rounded-lg transition text-gray-400"
            >
              <List className="w-5 h-5" />
              <span className="font-medium">Create a list</span>
            </Link>
          )}

          {customLists.length > 5 && (
            <Link
              href="/lists"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-4 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              View all {customLists.length} lists
            </Link>
          )}

          <div className="border-t border-zinc-800 my-2" />

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
