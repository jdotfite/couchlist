'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSidebar } from './SidebarContext';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, setIsOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only apply transforms after hydration to avoid mismatch
  const showSidebar = mounted && isOpen;

  return (
    <>
      {/* Sidebar */}
      <Sidebar />

      {/* Overlay for closing sidebar on mobile - always render, use CSS for visibility */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          showSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!showSidebar}
      />

      {/* Main Content - pushes right when sidebar opens */}
      <div
        className={`min-h-screen min-h-dvh bg-black transition-transform duration-300 ease-out ${
          showSidebar ? 'translate-x-[280px]' : 'translate-x-0'
        }`}
      >
        {children}
      </div>
    </>
  );
}
