'use client';

import Image from 'next/image';
import ProfileMenu from '@/components/ProfileMenu';
import NotificationBell from '@/components/notifications/NotificationBell';

interface MainHeaderProps {
  title?: string;
  showLogo?: boolean;
  children?: React.ReactNode;
}

export default function MainHeader({
  title,
  showLogo = false,
  children,
}: MainHeaderProps) {
  // Use z-30 to stay above page content (buttons have z-10), z-40 with children
  const zIndex = children ? 'z-40' : 'z-30';

  return (
    <header className={`sticky top-0 ${zIndex} bg-black px-4 py-3`}>
      <div className={`flex items-center justify-between${children ? ' mb-4' : ''}`}>
        <div className="flex items-center gap-3">
          <ProfileMenu />
          {showLogo ? (
            <Image
              src="/logo-flicklog.svg"
              alt="FlickLog"
              width={105}
              height={27}
              className="h-7 w-auto"
              priority
            />
          ) : title ? (
            <h1 className="text-2xl font-bold">{title}</h1>
          ) : null}
        </div>
        <NotificationBell />
      </div>
      {children}
    </header>
  );
}
