'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Heart, Clock, CheckCircle2, Play, PauseCircle, XCircle, RotateCcw, Sparkles, Info, Share2, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export interface MediaItem {
  id: number;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
}

interface ItemOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem | null;
  currentList: string;
  // Current state of tags for this item
  hasFavorite?: boolean;
  hasRewatch?: boolean;
  hasNostalgia?: boolean;
  // Status changes (mutually exclusive - moves item between lists)
  onMoveToList?: (item: MediaItem, targetList: string) => void;
  // Tag toggles (additive - can have multiple)
  onToggleTag?: (item: MediaItem, tag: string, add: boolean) => void;
  // Remove from current list
  onRemove?: (mediaId: number, mediaType: string) => void;
}

// Status lists are mutually exclusive
const STATUS_LISTS = ['watchlist', 'watching', 'onhold', 'dropped', 'finished', 'watched'];
// Tag lists can be combined with any status
const TAG_LISTS = ['favorites', 'rewatch', 'nostalgia'];

const listLabels: Record<string, string> = {
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

export default function ItemOptionsSheet({
  isOpen,
  onClose,
  item,
  currentList,
  hasFavorite = false,
  hasRewatch = false,
  hasNostalgia = false,
  onMoveToList,
  onToggleTag,
  onRemove,
}: ItemOptionsSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!item || !mounted) return null;

  const isStatusList = STATUS_LISTS.includes(currentList);
  const isTagList = TAG_LISTS.includes(currentList);
  const removeLabel = listLabels[currentList] || 'List';

  const handleMoveToList = (targetList: string) => {
    if (onMoveToList) {
      onMoveToList(item, targetList);
    }
    onClose();
  };

  const handleToggleTag = (tag: string, currentlyHas: boolean) => {
    if (onToggleTag) {
      onToggleTag(item, tag, !currentlyHas);
    }
    // Don't close - let user toggle multiple tags
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.media_id, item.media_type);
    }
    onClose();
  };

  // Determine which status options to show based on current list
  const getStatusOptions = () => {
    const options: { key: string; label: string; icon: React.ReactNode; color: string }[] = [];

    // From Watchlist
    if (currentList === 'watchlist') {
      options.push(
        { key: 'watching', label: 'Start Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'dropped', label: 'Drop', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
      );
    }

    // From Watching
    if (currentList === 'watching') {
      options.push(
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'onhold', label: 'Put On Hold', icon: <PauseCircle className="w-5 h-5" />, color: 'text-yellow-500' },
        { key: 'dropped', label: 'Drop', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
        { key: 'watchlist', label: 'Back to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    }

    // From On Hold
    if (currentList === 'onhold') {
      options.push(
        { key: 'watching', label: 'Resume Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
        { key: 'dropped', label: 'Drop', icon: <XCircle className="w-5 h-5" />, color: 'text-red-500' },
        { key: 'watchlist', label: 'Back to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    }

    // From Dropped
    if (currentList === 'dropped') {
      options.push(
        { key: 'watching', label: 'Try Again', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'watchlist', label: 'Back to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    }

    // From Finished/Watched
    if (currentList === 'finished' || currentList === 'watched') {
      options.push(
        { key: 'watching', label: 'Watch Again', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'watchlist', label: 'Add to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
      );
    }

    // From tag lists - show all status options
    if (isTagList) {
      options.push(
        { key: 'watchlist', label: 'Add to Watchlist', icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
        { key: 'watching', label: 'Start Watching', icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
        { key: 'finished', label: 'Mark as Finished', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-[#8b5ef4]' },
      );
    }

    return options;
  };

  const statusOptions = getStatusOptions();

  const sheetContent = (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl z-[101] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Item Preview */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
          <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
            <Image
              src={item.poster_path}
              alt={item.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg line-clamp-2">{item.title}</h3>
            <p className="text-sm text-gray-400 capitalize">{item.media_type}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Options */}
        <div className="py-2 max-h-[60vh] overflow-y-auto">
          {/* Status Change Options */}
          {statusOptions.length > 0 && onMoveToList && (
            <>
              <div className="px-6 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Move to</p>
              </div>
              {statusOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleMoveToList(option.key)}
                  className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition"
                >
                  <span className={option.color}>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </>
          )}

          {/* Tag Toggles */}
          {onToggleTag && (
            <>
              <div className="px-6 py-2 mt-2 border-t border-zinc-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Tags</p>
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => handleToggleTag('favorites', hasFavorite)}
                className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition"
              >
                <Heart className={`w-5 h-5 ${hasFavorite ? 'text-pink-500 fill-pink-500' : 'text-pink-500'}`} />
                <span className="flex-1 text-left">{hasFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                {hasFavorite && <Check className="w-5 h-5 text-pink-500" />}
              </button>

              {/* Rewatch Toggle */}
              <button
                onClick={() => handleToggleTag('rewatch', hasRewatch)}
                className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition"
              >
                <RotateCcw className={`w-5 h-5 ${hasRewatch ? 'text-cyan-500' : 'text-cyan-500'}`} />
                <span className="flex-1 text-left">{hasRewatch ? 'Remove from Rewatch' : 'Add to Rewatch'}</span>
                {hasRewatch && <Check className="w-5 h-5 text-cyan-500" />}
              </button>

              {/* Nostalgia Toggle */}
              <button
                onClick={() => handleToggleTag('nostalgia', hasNostalgia)}
                className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition"
              >
                <Sparkles className={`w-5 h-5 ${hasNostalgia ? 'text-amber-500' : 'text-amber-500'}`} />
                <span className="flex-1 text-left">{hasNostalgia ? 'Remove from Nostalgia' : 'Add to Nostalgia'}</span>
                {hasNostalgia && <Check className="w-5 h-5 text-amber-500" />}
              </button>
            </>
          )}

          {/* Other Actions */}
          <div className="border-t border-zinc-800 mt-2">
            <Link
              href={`/${item.media_type}/${item.media_id}`}
              onClick={onClose}
              className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition"
            >
              <Info className="w-5 h-5 text-gray-400" />
              <span>View Details</span>
            </Link>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: item.title,
                    url: `${window.location.origin}/${item.media_type}/${item.media_id}`,
                  });
                }
                onClose();
              }}
              className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition"
            >
              <Share2 className="w-5 h-5 text-gray-400" />
              <span>Share</span>
            </button>

            {onRemove && (
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-4 px-6 py-3 hover:bg-zinc-800 transition text-red-500"
              >
                <Trash2 className="w-5 h-5" />
                <span>Remove from {removeLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(sheetContent, document.body);
}
