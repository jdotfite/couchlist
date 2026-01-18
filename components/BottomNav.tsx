'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Plus } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const { isOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide nav on login and register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  // Use consistent classes for SSR - only apply transform after mount
  const shouldTransform = mounted && isOpen;

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/library', label: 'Your Library', icon: Library },
    { href: '/add', label: 'Add', icon: Plus },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-gradient-to-b from-transparent via-black/80 via-40% to-black/95 z-50 transition-transform duration-300 ease-out ${
      shouldTransform ? 'translate-x-[280px]' : 'translate-x-0'
    }`}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1"
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-white font-semibold' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
