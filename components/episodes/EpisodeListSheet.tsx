'use client';

import { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { TMDbSeasonDetails, EpisodeWithStatus } from '@/types/episodes';
import EpisodeRow from './EpisodeRow';

interface EpisodeListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  seasonNumber: number;
  showTitle: string;
  watchedEpisodes: Array<{ season: number; episode: number }>;
  onMarkEpisode: (episodeNumber: number, tmdbEpisodeId: number) => Promise<void>;
  onUnmarkEpisode: (episodeNumber: number) => Promise<void>;
  onMarkAllSeason: (episodes: Array<{ episodeNumber: number; tmdbEpisodeId: number }>) => Promise<void>;
  onUnmarkAllSeason: () => Promise<void>;
  isUpdating: boolean;
}

export default function EpisodeListSheet({
  isOpen,
  onClose,
  tmdbId,
  seasonNumber,
  showTitle,
  watchedEpisodes,
  onMarkEpisode,
  onUnmarkEpisode,
  onMarkAllSeason,
  onUnmarkAllSeason,
  isUpdating,
}: EpisodeListSheetProps) {
  const [seasonData, setSeasonData] = useState<TMDbSeasonDetails | null>(null);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [updatingEpisode, setUpdatingEpisode] = useState<number | null>(null);

  // Fetch season data when sheet opens
  useEffect(() => {
    if (isOpen && seasonNumber > 0) {
      setIsLoadingSeason(true);
      fetch(`/api/tv/${tmdbId}/season/${seasonNumber}`)
        .then(res => res.json())
        .then(data => {
          setSeasonData(data);
        })
        .catch(err => {
          console.error('Failed to fetch season:', err);
        })
        .finally(() => {
          setIsLoadingSeason(false);
        });
    }
  }, [isOpen, tmdbId, seasonNumber]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Find the first unwatched episode (the "next" episode)
  const watchedSet = new Set(
    watchedEpisodes
      .filter(ep => ep.season === seasonNumber)
      .map(ep => ep.episode)
  );

  let foundNext = false;
  const episodesWithStatus: EpisodeWithStatus[] = (seasonData?.episodes || []).map(ep => {
    const isWatched = watchedSet.has(ep.episode_number);
    let isNext = false;
    if (!isWatched && !foundNext) {
      isNext = true;
      foundNext = true;
    }
    return {
      ...ep,
      userStatus: isWatched ? 'watched' : 'unwatched',
      isNext,
    };
  });

  const allWatched = seasonData?.episodes &&
    seasonData.episodes.length > 0 &&
    seasonData.episodes.every(ep => watchedSet.has(ep.episode_number));

  const handleToggleEpisode = async (episode: EpisodeWithStatus) => {
    setUpdatingEpisode(episode.episode_number);
    try {
      if (episode.userStatus === 'watched') {
        await onUnmarkEpisode(episode.episode_number);
      } else {
        await onMarkEpisode(episode.episode_number, episode.id);
      }
    } finally {
      setUpdatingEpisode(null);
    }
  };

  const handleMarkAll = async () => {
    if (!seasonData?.episodes) return;

    if (allWatched) {
      await onUnmarkAllSeason();
    } else {
      const episodes = seasonData.episodes.map(ep => ({
        episodeNumber: ep.episode_number,
        tmdbEpisodeId: ep.id,
      }));
      await onMarkAllSeason(episodes);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-zinc-900 rounded-t-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="font-semibold text-lg">Season {seasonNumber}</h3>
            <p className="text-sm text-gray-400">{showTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {seasonData?.episodes && seasonData.episodes.length > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isUpdating}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5
                  ${allWatched
                    ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                    : 'bg-[#8b5ef4] text-white hover:bg-[#7a4ed3]'
                  }
                  disabled:opacity-50
                `}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : allWatched ? (
                  'Unmark All'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Mark All
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Episode list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoadingSeason ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#8b5ef4]" />
            </div>
          ) : episodesWithStatus.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No episodes found
            </div>
          ) : (
            episodesWithStatus.map(episode => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                onToggle={() => handleToggleEpisode(episode)}
                isUpdating={updatingEpisode === episode.episode_number || isUpdating}
              />
            ))
          )}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-6" />
      </div>
    </>,
    document.body
  );
}
