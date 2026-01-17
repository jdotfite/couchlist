'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  Clock,
  Play,
  PauseCircle,
  XCircle,
  CheckCircle2,
  Heart,
  RotateCcw,
  Sparkles,
  Share2,
  Info,
  Trash2,
  Loader2,
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useMediaStatus, type MediaInfo, type MediaStatus } from '@/hooks/useMediaStatus';

// Status lists are mutually exclusive
const STATUS_LISTS = ['watchlist', 'watching', 'onhold', 'dropped', 'finished', 'watched'];
// Tag lists can be combined with any status
const TAG_LISTS = ['favorites', 'rewatch', 'nostalgia'];

interface StatusOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface MediaOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Media info (required)
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string;
  // Optional: provide current status if already known (e.g., from library page)
  // If not provided, status will be fetched when sheet opens
  currentStatus?: string | null;
  currentTags?: {
    favorites?: boolean;
    rewatch?: boolean;
    nostalgia?: boolean;
  };
  // Callbacks for when actions complete (useful for parent to update its state)
  onStatusChange?: (newStatus: string) => void;
  onTagToggle?: (tag: string, added: boolean) => void;
  onRemove?: () => void;
}

const LIST_LABELS: Record<string, string> = {
  watchlist: 'Watchlist',
  watching: 'Watching',
  onhold: 'On Hold',
  dropped: 'Dropped',
  finished: 'Finished',
  watched: 'Finished',
  favorites: 'Favorites',
  rewatch: 'Rewatch',
  nostalgia: 'Nostalgia',
};

export default function MediaOptionsSheet({
  isOpen,
  onClose,
  mediaId,
  mediaType,
  title,
  posterPath,
  currentStatus: providedStatus,
  currentTags: providedTags,
  onStatusChange,
  onTagToggle,
  onRemove,
}: MediaOptionsSheetProps) {
  const {
    status: fetchedStatus,
    isLoading,
    isUpdating,
    fetchStatus,
    setStatusTo,
    toggleTag,
    removeFromList,
    clearStatus,
  } = useMediaStatus();

  // Determine the effective status - use provided or fetched
  const hasProvidedStatus = providedStatus !== undefined;
  const effectiveStatus: MediaStatus | null = hasProvidedStatus
    ? {
        status: providedStatus,
        tags: {
          favorites: providedTags?.favorites ?? false,
          rewatch: providedTags?.rewatch ?? false,
          nostalgia: providedTags?.nostalgia ?? false,
        },
        rating: null,
      }
    : fetchedStatus;

  const currentList = effectiveStatus?.status || null;
  const isStatusList = currentList ? STATUS_LISTS.includes(currentList) : false;
  const isTagList = currentList ? TAG_LISTS.includes(currentList) : false;

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
  };

  // Handle status change
  const handleSetStatus = useCallback(async (targetStatus: string) => {
    const success = await setStatusTo(targetStatus, mediaInfo);
    if (success) {
      onStatusChange?.(targetStatus);
      onClose();
    }
  }, [setStatusTo, mediaInfo, onStatusChange, onClose]);

  // Handle tag toggle
  const handleToggleTag = useCallback(async (tag: string, currentlyHas: boolean) => {
    const success = await toggleTag(tag, !currentlyHas, mediaInfo);
    if (success) {
      onTagToggle?.(tag, !currentlyHas);
      // Don't close - let user toggle multiple tags
    }
  }, [toggleTag, mediaInfo, onTagToggle]);

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

  // Determine which status options to show
  const getStatusOptions = (): StatusOption[] => {
    const options: StatusOption[] = [];

    // If no current status (item not in any list), show all "Add to" options
    if (!currentList) {
      return [
        { key: 'watchlist', label: 'Add to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
        { key: 'watching', label: 'Add to Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'onhold', label: 'Add to On Hold', icon: <PauseCircle className="w-5 h-5" />, color: 'text-yellow-500' },
        { key: 'dropped', label: 'Add to Dropped', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
      ];
    }

    // Context-aware options based on current list
    if (currentList === 'watchlist') {
      options.push(
        { key: 'watching', label: 'Start Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'dropped', label: 'Drop', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
      );
    } else if (currentList === 'watching') {
      options.push(
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'onhold', label: 'Put On Hold', icon: <PauseCircle className="w-5 h-5" />, color: 'text-yellow-500' },
        { key: 'dropped', label: 'Drop', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
        { key: 'watchlist', label: 'Back to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    } else if (currentList === 'onhold') {
      options.push(
        { key: 'watching', label: 'Resume Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'dropped', label: 'Drop', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
        { key: 'watchlist', label: 'Back to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    } else if (currentList === 'dropped') {
      options.push(
        { key: 'watching', label: 'Try Again', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'watchlist', label: 'Back to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    } else if (currentList === 'finished' || currentList === 'watched') {
      options.push(
        { key: 'watching', label: 'Watch Again', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'watchlist', label: 'Add to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    } else if (isTagList) {
      // From tag lists, show all status options
      options.push(
        { key: 'watchlist', label: 'Add to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
        { key: 'watching', label: 'Start Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
      );
    }

    return options;
  };

  const statusOptions = getStatusOptions();
  const hasFavorite = effectiveStatus?.tags?.favorites ?? false;
  const hasRewatch = effectiveStatus?.tags?.rewatch ?? false;
  const hasNostalgia = effectiveStatus?.tags?.nostalgia ?? false;
  const removeLabel = currentList ? LIST_LABELS[currentList] || 'List' : '';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Item Preview */}
      <div className="flex items-center gap-4 px-4 pb-4 border-b border-zinc-800">
        <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
          <Image
            src={posterPath}
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
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
                  <span className={option.color}>{option.icon}</span>
                  <span className="text-white">{option.label}</span>
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin ml-auto text-gray-400" />}
                </button>
              ))}
            </>
          )}

          {/* Tag Toggles */}
          <div className={`${statusOptions.length > 0 ? 'border-t border-zinc-800 mt-2' : ''}`}>
            <div className="px-4 py-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tags</p>
            </div>

            <button
              onClick={() => handleToggleTag('favorites', hasFavorite)}
              disabled={isUpdating}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <Heart className={`w-5 h-5 ${hasFavorite ? 'text-pink-500 fill-pink-500' : 'text-pink-500'}`} />
              <span className="flex-1 text-left text-white">{hasFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
              {hasFavorite && <Check className="w-5 h-5 text-pink-500" />}
            </button>

            <button
              onClick={() => handleToggleTag('rewatch', hasRewatch)}
              disabled={isUpdating}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <RotateCcw className={`w-5 h-5 text-cyan-500`} />
              <span className="flex-1 text-left text-white">{hasRewatch ? 'Remove from Rewatch' : 'Add to Rewatch'}</span>
              {hasRewatch && <Check className="w-5 h-5 text-cyan-500" />}
            </button>

            <button
              onClick={() => handleToggleTag('nostalgia', hasNostalgia)}
              disabled={isUpdating}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <Sparkles className={`w-5 h-5 text-amber-500`} />
              <span className="flex-1 text-left text-white">{hasNostalgia ? 'Remove from Nostalgia' : 'Add to Nostalgia'}</span>
              {hasNostalgia && <Check className="w-5 h-5 text-amber-500" />}
            </button>
          </div>

          {/* Other Actions */}
          <div className="border-t border-zinc-800 mt-2">
            <Link
              href={`/${mediaType}/${mediaId}`}
              onClick={onClose}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition"
            >
              <Info className="w-5 h-5 text-gray-400" />
              <span className="text-white">View Details</span>
            </Link>

            <button
              onClick={handleShare}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition"
            >
              <Share2 className="w-5 h-5 text-gray-400" />
              <span className="text-white">Share</span>
            </button>

            {currentList && isStatusList && (
              <button
                onClick={handleRemove}
                disabled={isUpdating}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition text-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>Remove from {removeLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
