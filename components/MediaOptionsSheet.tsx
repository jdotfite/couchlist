'use client';

import { useEffect, useCallback, useState } from 'react';
import Image from 'next/image';
import {
  Share2,
  Send,
  Trash2,
  Loader2,
  ListPlus,
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useMediaStatus, type MediaInfo, type MediaStatus } from '@/hooks/useMediaStatus';
import { getImageUrl } from '@/lib/tmdb';
import FriendSuggestionSheet from './suggestions/FriendSuggestionSheet';
import AddToListSheet from './lists/AddToListSheet';
import { SYSTEM_LISTS, SYSTEM_LIST_MAP } from '@/lib/list-config';

// Status lists are mutually exclusive
const STATUS_LISTS = ['watchlist', 'watching', 'finished', 'watched'];

interface MediaOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Media info (required)
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string;
  // Genre and year data for filtering
  genreIds?: number[];
  releaseYear?: number | null;
  // Optional: provide current status if already known (e.g., from library page)
  // If not provided, status will be fetched when sheet opens
  currentStatus?: string | null;
  // Callbacks for when actions complete (useful for parent to update its state)
  onStatusChange?: (newStatus: string) => void;
  onRemove?: () => void;
}

const LIST_LABELS: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  finished: 'Watched',
  watched: 'Watched',
};

export default function MediaOptionsSheet({
  isOpen,
  onClose,
  mediaId,
  mediaType,
  title,
  posterPath,
  genreIds,
  releaseYear,
  currentStatus: providedStatus,
  onStatusChange,
  onRemove,
}: MediaOptionsSheetProps) {
  const [suggestionSheetOpen, setSuggestionSheetOpen] = useState(false);
  const [addToListSheetOpen, setAddToListSheetOpen] = useState(false);

  const {
    status: fetchedStatus,
    isLoading,
    isUpdating,
    fetchStatus,
    setStatusTo,
    removeFromList,
    clearStatus,
  } = useMediaStatus();

  // Determine the effective status - use provided or fetched
  const hasProvidedStatus = providedStatus !== undefined;
  const effectiveStatus: MediaStatus | null = hasProvidedStatus
    ? {
        status: providedStatus,
        rating: null,
        notes: null,
      }
    : fetchedStatus;

  const currentList = effectiveStatus?.status || null;
  const isStatusList = currentList ? STATUS_LISTS.includes(currentList) : false;

  // Fetch status when sheet opens (only if not provided)
  useEffect(() => {
    if (isOpen && !hasProvidedStatus) {
      fetchStatus(mediaId, mediaType);
    }
    if (!isOpen) {
      clearStatus();
    }
  }, [isOpen, mediaId, mediaType, hasProvidedStatus, fetchStatus, clearStatus]);

  const mediaInfo: MediaInfo = {
    mediaId,
    mediaType,
    title,
    posterPath,
    genreIds,
    releaseYear,
  };

  // Handle status change
  const handleSetStatus = useCallback(async (targetStatus: string) => {
    const success = await setStatusTo(targetStatus, mediaInfo);
    if (success) {
      onStatusChange?.(targetStatus);
      onClose();
    }
  }, [setStatusTo, mediaInfo, onStatusChange, onClose]);

  // Handle remove
  const handleRemove = useCallback(async () => {
    if (!currentList) return;
    const success = await removeFromList(currentList, mediaInfo);
    if (success) {
      onRemove?.();
      onClose();
    }
  }, [removeFromList, currentList, mediaInfo, onRemove, onClose]);

  // Handle share
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title,
        url: `${window.location.origin}/${mediaType}/${mediaId}`,
      });
    }
    onClose();
  }, [title, mediaType, mediaId, onClose]);

  // Build status options from SYSTEM_LISTS config
  // Order: Watchlist, Watching, Watched
  // Show all options except the current one
  const getStatusOptions = () => {
    const isInLibrary = !!currentList;
    const normalizedCurrent = currentList === 'watched' ? 'finished' : currentList;

    return SYSTEM_LISTS
      .filter(list => list.slug !== normalizedCurrent) // Don't show current status
      .map(list => {
        const Icon = list.icon;
        const prefix = isInLibrary ? 'Move to' : 'Add to';
        return {
          key: list.slug,
          label: `${prefix} ${list.title}`,
          icon: <Icon className="w-5 h-5" />,
          config: list,
        };
      });
  };

  const statusOptions = getStatusOptions();
  const removeLabel = currentList ? LIST_LABELS[currentList] || 'List' : '';

  return (
    <>
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Item Preview */}
      <div className="flex items-center gap-4 px-4 pb-4 border-b border-zinc-800">
        <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
          <Image
            src={getImageUrl(posterPath)}
            alt={title}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white line-clamp-2">{title}</h3>
          <p className="text-sm text-gray-400 capitalize">{mediaType === 'movie' ? 'Movie' : 'TV Show'}</p>
          {currentList && (
            <p className="text-xs text-gray-500">In {LIST_LABELS[currentList]}</p>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !hasProvidedStatus && (
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin-fast text-gray-400" />
        </div>
      )}

      {/* Options */}
      {(!isLoading || hasProvidedStatus) && (
        <div className="py-2 max-h-[60vh] overflow-y-auto">
          {/* Status Options */}
          {statusOptions.length > 0 && (
            <>
              <div className="px-4 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {currentList ? 'Move to' : 'Add to'}
                </p>
              </div>
              {statusOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleSetStatus(option.key)}
                  disabled={isUpdating}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${option.config.bgColorClass} flex items-center justify-center`}>
                    <span className="text-white">{option.icon}</span>
                  </div>
                  <span className="text-white">{option.label}</span>
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin-fast ml-auto text-gray-400" />}
                </button>
              ))}
            </>
          )}

          {/* Other Actions */}
          <div className="border-t border-zinc-800 mt-2">
            <button
              onClick={() => setAddToListSheetOpen(true)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition"
            >
              <ListPlus className="w-5 h-5 text-[#8b5ef4]" />
              <span className="text-white">Add to List</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition"
            >
              <Share2 className="w-5 h-5 text-gray-400" />
              <span className="text-white">Share</span>
            </button>

            <button
              onClick={() => setSuggestionSheetOpen(true)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition"
            >
              <Send className="w-5 h-5 text-[#8b5ef4]" />
              <span className="text-white">Send to Friend</span>
            </button>

            {currentList && isStatusList && (
              <button
                onClick={handleRemove}
                disabled={isUpdating}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition text-status-dropped disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>Remove from {removeLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </BottomSheet>

      <FriendSuggestionSheet
        isOpen={suggestionSheetOpen}
        onClose={() => setSuggestionSheetOpen(false)}
        mediaId={mediaId}
        mediaType={mediaType}
        title={title}
        posterPath={posterPath}
        releaseYear={releaseYear}
      />

      <AddToListSheet
        isOpen={addToListSheetOpen}
        onClose={() => setAddToListSheetOpen(false)}
        tmdbId={mediaId}
        mediaType={mediaType}
        title={title}
        posterPath={posterPath}
      />
    </>
  );
}
