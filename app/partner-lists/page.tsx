'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Partner lists have been deprecated in favor of collaborative lists with friends
export default function PartnerListsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return null;
}
