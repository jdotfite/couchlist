'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSidebar } from './SidebarContext';
import { useProfileImage } from '@/hooks/useProfileImage';

export default function ProfileMenu() {
  const { setIsOpen } = useSidebar();
  const { data: session } = useSession();
  const { profileImage } = useProfileImage();

  if (!session?.user) {
    return (
      <Link href="/login" className="flex-shrink-0 text-sm text-gray-400 hover:text-white px-4 py-2">
        Log in
      </Link>
    );
  }

  const getInitials = () => {
    const name = session?.user?.name || session?.user?.email?.split('@')[0] || 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const userInitials = getInitials();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="flex-shrink-0"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-semibold text-xs hover:scale-110 transition-transform overflow-hidden">
        {profileImage ? (
          <img src={profileImage} alt="" className="w-full h-full object-cover" />
        ) : (
          userInitials
        )}
      </div>
    </button>
  );
}
