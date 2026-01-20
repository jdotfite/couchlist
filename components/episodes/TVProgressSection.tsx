'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEpisodeProgress } from '@/hooks/useEpisodeProgress';
import ProgressBar from './ProgressBar';
import UpNextCard from './UpNextCard';
import SeasonPills from './SeasonPills';
import EpisodeListSheet from './EpisodeListSheet';
import type { SeasonProgress, TMDbSeasonDetails } from '@/types/episodes';
import { Loader2 } from 'lucide-react';

interface TVProgressSectionProps {
  tmdbId: number;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  showTitle: string;
  posterPath: string | null;
  isLoggedIn: boolean;
}

export default function TVProgressSection({
  tmdbId,
  numberOfSeasons,
  numberOfEpisodes,
  showTitle,
  posterPath,
  isLoggedIn,
}: TVProgressSectionProps) {
  const {
    progress,
    isLoading,
    isUpdating,
    fetchProgress,
    markEpisode,
    unmarkEpisode,
    markSeason,
    unmarkSeason,
  } = useEpisodeProgress();

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [seasonEpisodeCounts, setSeasonEpisodeCounts] = useState<Array<{ seasonNumber: number; episodeCount: number }>>([]);
  const [nextEpisodeData, setNextEpisodeData] = useState<{ name: string; runtime: number | null } | null>(null);

  // Fetch season episode counts from TMDb (to know total episodes per season)
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchSeasonCounts = async () => {
      const counts: Array<{ seasonNumber: number; episodeCount: number }> = [];

      // Fetch each season to get episode count
      // Note: This could be optimized by adding this data to the main TV details endpoint
      for (let s = 1; s <= numberOfSeasons; s++) {
        try {
          const res = await fetch(`/api/tv/${tmdbId}/season/${s}`);
          if (res.ok) {
            const data: TMDbSeasonDetails = await res.json();
            counts.push({
              seasonNumber: s,
              episodeCount: data.episodes?.length || 0,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch season ${s}:`, err);
          // Estimate based on total
          counts.push({
            seasonNumber: s,
            episodeCount: Math.ceil(numberOfEpisodes / numberOfSeasons),
          });
        }
      }

      setSeasonEpisodeCounts(counts);
    };

    fetchSeasonCounts();
  }, [tmdbId, numberOfSeasons, numberOfEpisodes, isLoggedIn]);

  // Fetch progress once we have season counts
  useEffect(() => {
    if (!isLoggedIn || seasonEpisodeCounts.length === 0) return;

    const totalEps = seasonEpisodeCounts.reduce((sum, s) => sum + s.episodeCount, 0);
    fetchProgress(tmdbId, totalEps, seasonEpisodeCounts);
  }, [tmdbId, seasonEpisodeCounts, isLoggedIn, fetchProgress]);

  // Fetch next episode name when progress updates
  useEffect(() => {
    if (progress?.nextEpisode) {
      const { seasonNumber, episodeNumber } = progress.nextEpisode;
      fetch(`/api/tv/${tmdbId}/season/${seasonNumber}`)
        .then(res => res.json())
        .then((data: TMDbSeasonDetails) => {
          const episode = data.episodes?.find(ep => ep.episode_number === episodeNumber);
          if (episode) {
            setNextEpisodeData({
              name: episode.name,
              runtime: episode.runtime,
            });
          }
        })
        .catch(console.error);
    } else {
      setNextEpisodeData(null);
    }
  }, [progress?.nextEpisode, tmdbId]);

  const handleSeasonTap = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    setIsSheetOpen(true);
  };

  const handleMarkNextEpisode = async () => {
    if (!progress?.nextEpisode) return;

    await markEpisode({
      tmdbId,
      seasonNumber: progress.nextEpisode.seasonNumber,
      episodeNumber: progress.nextEpisode.episodeNumber,
      title: showTitle,
      posterPath,
    });
  };

  const handleMarkEpisode = useCallback(async (episodeNumber: number, tmdbEpisodeId: number) => {
    if (selectedSeason === null) return;

    await markEpisode({
      tmdbId,
      seasonNumber: selectedSeason,
      episodeNumber,
      tmdbEpisodeId,
      title: showTitle,
      posterPath,
    });
  }, [tmdbId, selectedSeason, showTitle, posterPath, markEpisode]);

  const handleUnmarkEpisode = useCallback(async (episodeNumber: number) => {
    if (selectedSeason === null) return;
    await unmarkEpisode(tmdbId, selectedSeason, episodeNumber);
  }, [tmdbId, selectedSeason, unmarkEpisode]);

  const handleMarkAllSeason = useCallback(async (episodes: Array<{ episodeNumber: number; tmdbEpisodeId: number }>) => {
    if (selectedSeason === null) return;

    await markSeason({
      tmdbId,
      seasonNumber: selectedSeason,
      episodes: episodes.map(ep => ({
        episodeNumber: ep.episodeNumber,
        tmdbEpisodeId: ep.tmdbEpisodeId,
      })),
      title: showTitle,
      posterPath,
    });
  }, [tmdbId, selectedSeason, showTitle, posterPath, markSeason]);

  const handleUnmarkAllSeason = useCallback(async () => {
    if (selectedSeason === null) return;
    await unmarkSeason(tmdbId, selectedSeason);
  }, [tmdbId, selectedSeason, unmarkSeason]);

  // Don't render if not logged in
  if (!isLoggedIn) {
    return null;
  }

  // Loading state
  if (isLoading || seasonEpisodeCounts.length === 0) {
    return (
      <div className="pt-4 space-y-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#8b5ef4]" />
        </div>
      </div>
    );
  }

  // Build seasons array for pills
  const seasons: SeasonProgress[] = seasonEpisodeCounts.map(({ seasonNumber, episodeCount }) => {
    const seasonProgress = progress?.seasons.find(s => s.seasonNumber === seasonNumber);
    return {
      seasonNumber,
      totalEpisodes: episodeCount,
      watchedEpisodes: seasonProgress?.watchedEpisodes || 0,
      isComplete: seasonProgress?.isComplete || false,
    };
  });

  const hasStartedWatching = progress && progress.watchedEpisodes > 0;
  const isComplete = progress && progress.percentage === 100;

  return (
    <div className="pt-4 space-y-4">
      {/* Progress Bar */}
      <ProgressBar
        watched={progress?.watchedEpisodes || 0}
        total={progress?.totalEpisodes || numberOfEpisodes}
      />

      {/* Up Next Card - only show if not complete and has next episode */}
      {!isComplete && progress?.nextEpisode && nextEpisodeData && (
        <UpNextCard
          seasonNumber={progress.nextEpisode.seasonNumber}
          episodeNumber={progress.nextEpisode.episodeNumber}
          episodeName={nextEpisodeData.name}
          runtime={nextEpisodeData.runtime}
          onMarkWatched={handleMarkNextEpisode}
          isUpdating={isUpdating}
        />
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
          <p className="text-green-400 font-medium">All caught up!</p>
          <p className="text-sm text-gray-400">You've watched all {progress.totalEpisodes} episodes</p>
        </div>
      )}

      {/* Season Pills */}
      <SeasonPills
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSeasonTap={handleSeasonTap}
      />

      {/* Episode List Sheet */}
      <EpisodeListSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedSeason(null);
        }}
        tmdbId={tmdbId}
        seasonNumber={selectedSeason || 1}
        showTitle={showTitle}
        watchedEpisodes={progress?.watchedList.map(ep => ({ season: ep.season, episode: ep.episode })) || []}
        onMarkEpisode={handleMarkEpisode}
        onUnmarkEpisode={handleUnmarkEpisode}
        onMarkAllSeason={handleMarkAllSeason}
        onUnmarkAllSeason={handleUnmarkAllSeason}
        isUpdating={isUpdating}
      />
    </div>
  );
}
