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

  // Use consistent classes for SSR - only apply transform after mount
  const shouldTransform = mounted && isOpen;

  return (
    <>
      {/* Sidebar */}
      <Sidebar />

      {/* Overlay for closing sidebar on mobile */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          shouldTransform ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Main Content - pushes right when sidebar opens */}
      <div
        className={`min-h-screen transition-transform duration-300 ease-out ${
          shouldTransform ? 'translate-x-[280px]' : 'translate-x-0'
        }`}
      >
        {children}
      </div>
    </>
  );
}
