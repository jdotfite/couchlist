'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainHeader from '@/components/ui/MainHeader';
import SearchHero from '@/components/home/SearchHero';
import MediaRow from '@/components/home/MediaRow';
import NewEpisodesRow from '@/components/home/NewEpisodesRow';
import TrendingRow from '@/components/home/TrendingRow';
import HomePageSkeleton from '@/components/home/HomePageSkeleton';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useHomeRecommendations } from '@/hooks/useHomeRecommendations';
import MediaOptionsSheet from '@/components/MediaOptionsSheet';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  // Get watching items from Zustand store
  const {
    watchingItems,
    isLoading: isLibraryLoading,
    lastFetched,
    fetchLibrary,
  } = useLibraryStore();

  // Get recommendations data
  const {
    newEpisodes,
    recommendationSource,
    recommendations,
    trending,
    isLoading: isRecommendationsLoading,
  } = useHomeRecommendations();

  // Status modal state for quick-add from trending/recommendations
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    title: string;
    poster_path: string | null;
    media_type: 'movie' | 'tv';
  } | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLibrary();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, fetchLibrary]);

  // Handle quick-add from trending/recommendation rows
  const handleAddClick = (item: {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    media_type: 'movie' | 'tv';
  }) => {
    setSelectedItem({
      id: item.id,
      title: item.title || item.name || 'Unknown',
      poster_path: item.poster_path,
      media_type: item.media_type,
    });
    setModalOpen(true);
  };

  // Show skeleton while loading (only on first load)
  if (status === 'loading' || status === 'unauthenticated' || (isLibraryLoading && !lastFetched)) {
    return <HomePageSkeleton />;
  }

  // Build recommendation row title
  const recommendationTitle = recommendationSource
    ? `Because you're watching ${recommendationSource.title}`
    : 'Recommended For You';

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <MainHeader showLogo />

      <main className="px-4">
        {/* Search Hero */}
        <SearchHero />

        {/* Continue Watching */}
        {watchingItems.length > 0 && (
          <MediaRow
            title="Continue Watching"
            items={watchingItems}
            seeAllHref="/library?status=watching"
            addHref="/search"
            status="watching"
          />
        )}

        {/* Airing Soon - shows with upcoming episodes */}
        <NewEpisodesRow episodes={newEpisodes} />

        {/* Personalized Recommendations */}
        {recommendations.length > 0 && (
          <TrendingRow
            title={recommendationTitle}
            items={recommendations}
            onAddClick={handleAddClick}
          />
        )}

        {/* Trending Now - discovery fallback */}
        {trending.length > 0 && (
          <TrendingRow
            title="Trending Now"
            items={trending}
            onAddClick={handleAddClick}
          />
        )}
      </main>

      {/* Media Options Sheet for quick-add */}
      {selectedItem && (
        <MediaOptionsSheet
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedItem(null);
          }}
          mediaId={selectedItem.id}
          mediaType={selectedItem.media_type}
          title={selectedItem.title}
          posterPath={selectedItem.poster_path || ''}
        />
      )}
    </div>
  );
}
