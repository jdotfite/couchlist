'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function DiscoverRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve any filter param as type
    const filter = searchParams.get('filter');
    let redirectUrl = '/search';
    if (filter === 'movies') {
      redirectUrl = '/search?type=movies';
    } else if (filter === 'tv') {
      redirectUrl = '/search?type=tv';
    }
    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}

// Redirect /discover to /search
export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <DiscoverRedirect />
    </Suspense>
  );
}
