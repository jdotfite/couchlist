'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Plus, Share2, Loader2, Heart, Play, PauseCircle, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import BottomSheet from './BottomSheet';

interface AddToListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  posterPath: string;
  mediaType: 'movie' | 'tv';
  mediaId?: number;
  onAddToWatchlist?: () => void;
  onMarkAsWatched?: () => void;
}

export default function AddToListSheet({
  isOpen,
  onClose,
  title,
  posterPath,
  mediaType,
  mediaId,
  onAddToWatchlist,
  onMarkAsWatched,
}: AddToListSheetProps) {
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);
  const [isAddingWatched, setIsAddingWatched] = useState(false);
  const [isAddingFavorites, setIsAddingFavorites] = useState(false);
  const [isAddingWatching, setIsAddingWatching] = useState(false);
  const [isAddingOnHold, setIsAddingOnHold] = useState(false);
  const [isAddingDropped, setIsAddingDropped] = useState(false);
  const [isAddingRewatch, setIsAddingRewatch] = useState(false);
  const [isAddingNostalgia, setIsAddingNostalgia] = useState(false);

  const handleAddToWatchlist = async () => {
    if (onAddToWatchlist) {
      onAddToWatchlist();
      onClose();
      return;
    }

    if (!mediaId || isAddingWatchlist) return;

    setIsAddingWatchlist(true);
    try {
      console.log('Adding to watchlist:', { mediaId, mediaType, title });
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      if (response.ok) {
        console.log('Successfully added to watchlist');
        onClose();
      } else {
        console.error('Failed to add to watchlist');
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
    } finally {
      setIsAddingWatchlist(false);
    }
  };

  const handleMarkAsWatched = async () => {
    if (onMarkAsWatched) {
      onMarkAsWatched();
      onClose();
      return;
    }

    if (!mediaId || isAddingWatched) return;

    setIsAddingWatched(true);
    try {
      console.log('Marking as finished:', { mediaId, mediaType, title });
      const response = await fetch('/api/watched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();
      console.log('Response:', response.status, data);

      if (response.ok) {
        console.log('Successfully marked as finished');
        onClose();
      } else {
        console.error('Failed to mark as finished:', data);
      }
    } catch (error) {
      console.error('Failed to mark as finished:', error);
    } finally {
      setIsAddingWatched(false);
    }
  };

  const handleAddToFavorites = async () => {
    if (!mediaId || isAddingFavorites) return;

    setIsAddingFavorites(true);
    try {
      console.log('Adding to favorites:', { mediaId, mediaType, title });
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();
      console.log('Response:', response.status, data);

      if (response.ok) {
        console.log('Successfully added to favorites');
        onClose();
      } else {
        console.error('Failed to add to favorites:', data);
      }
    } catch (error) {
      console.error('Failed to add to favorites:', error);
    } finally {
      setIsAddingFavorites(false);
    }
  };

  const handleAddToWatching = async () => {
    if (!mediaId || isAddingWatching) return;

    setIsAddingWatching(true);
    try {
      const response = await fetch('/api/watching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to add to watching:', data);
      }
    } catch (error) {
      console.error('Failed to add to watching:', error);
    } finally {
      setIsAddingWatching(false);
    }
  };

  const handleAddToOnHold = async () => {
    if (!mediaId || isAddingOnHold) return;

    setIsAddingOnHold(true);
    try {
      const response = await fetch('/api/onhold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to add to on hold:', data);
      }
    } catch (error) {
      console.error('Failed to add to on hold:', error);
    } finally {
      setIsAddingOnHold(false);
    }
  };

  const handleAddToDropped = async () => {
    if (!mediaId || isAddingDropped) return;

    setIsAddingDropped(true);
    try {
      const response = await fetch('/api/dropped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to add to dropped:', data);
      }
    } catch (error) {
      console.error('Failed to add to dropped:', error);
    } finally {
      setIsAddingDropped(false);
    }
  };

  const handleAddToRewatch = async () => {
    if (!mediaId || isAddingRewatch) return;

    setIsAddingRewatch(true);
    try {
      const response = await fetch('/api/rewatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to add to rewatch:', data);
      }
    } catch (error) {
      console.error('Failed to add to rewatch:', error);
    } finally {
      setIsAddingRewatch(false);
    }
  };

  const handleAddToNostalgia = async () => {
    if (!mediaId || isAddingNostalgia) return;

    setIsAddingNostalgia(true);
    try {
      const response = await fetch('/api/nostalgia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: mediaId,
          media_type: mediaType,
          title,
          poster_path: posterPath,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to add to nostalgia:', data);
      }
    } catch (error) {
      console.error('Failed to add to nostalgia:', error);
    } finally {
      setIsAddingNostalgia(false);
    }
  };

  const isBusy =
    isAddingWatchlist ||
    isAddingWatched ||
    isAddingFavorites ||
    isAddingWatching ||
    isAddingOnHold ||
    isAddingDropped ||
    isAddingRewatch ||
    isAddingNostalgia;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Content Info */}
      <div className="px-4 pb-4 flex items-center gap-3 border-b border-zinc-800">
        <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-zinc-800">
          <Image
            src={posterPath}
            alt={title}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{title}</h3>
          <p className="text-sm text-gray-400 capitalize">{mediaType === 'movie' ? 'Movie' : 'TV Show'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="py-2">
        <button
          type="button"
          onClick={handleAddToWatchlist}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingWatchlist ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <Plus className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to Watchlist</span>
        </button>

        <button
          type="button"
          onClick={handleAddToWatching}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingWatching ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <Play className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to Watching</span>
        </button>

        <button
          type="button"
          onClick={handleMarkAsWatched}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingWatched ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <Check className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Mark as Finished</span>
        </button>

        <button
          type="button"
          onClick={handleAddToOnHold}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingOnHold ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <PauseCircle className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to On Hold</span>
        </button>

        <button
          type="button"
          onClick={handleAddToDropped}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingDropped ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <XCircle className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to Dropped</span>
        </button>

        <button
          type="button"
          onClick={handleAddToRewatch}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingRewatch ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <RotateCcw className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to Rewatch</span>
        </button>

        <button
          type="button"
          onClick={handleAddToNostalgia}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingNostalgia ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to Nostalgia</span>
        </button>

        <button
          type="button"
          onClick={handleAddToFavorites}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingFavorites ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <Heart className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Add to Favorites</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          <Share2 className="w-6 h-6 text-gray-400" />
          <span className="text-white font-medium">Share</span>
        </button>
      </div>
    </BottomSheet>
  );
}
