'use client';

import { ReactNode } from 'react';
import { useSidebar } from './SidebarContext';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      {/* Sidebar */}
      <Sidebar />

      {/* Overlay for closing sidebar on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Content - pushes right when sidebar opens */}
      <div
        className={`min-h-screen transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-[280px]' : 'translate-x-0'
        }`}
      >
        {children}
      </div>
    </>
  );
}
