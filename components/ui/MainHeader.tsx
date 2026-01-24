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
  // Only sticky when there are children (like search input)
  // Use higher z-index when sticky to stay above page content
  const positionClass = children ? 'sticky top-0 z-40' : '';

  return (
    <header className={`${positionClass} bg-black px-4 py-3`}>
      <div className={`flex items-center justify-between${children ? ' mb-4' : ''}`}>
        <div className="flex items-center gap-3">
          <ProfileMenu />
          {showLogo ? (
            <Image
              src="/logo-flicklog.svg"
              alt="FlickLog"
              width={105}
              height={26}
              className="h-[26px] w-auto"
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
