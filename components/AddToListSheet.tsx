'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Plus, Share2, Loader2, Heart } from 'lucide-react';
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
      console.log('Marking as watched:', { mediaId, mediaType, title });
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
        console.log('Successfully marked as watched');
        onClose();
      } else {
        console.error('Failed to mark as watched:', data);
      }
    } catch (error) {
      console.error('Failed to mark as watched:', error);
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
          disabled={isAddingWatchlist || isAddingWatched || isAddingFavorites}
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
          onClick={handleMarkAsWatched}
          disabled={isAddingWatchlist || isAddingWatched || isAddingFavorites}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          {isAddingWatched ? (
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          ) : (
            <Check className="w-6 h-6 text-gray-400" />
          )}
          <span className="text-white font-medium">Mark as Watched</span>
        </button>

        <button
          type="button"
          onClick={handleAddToFavorites}
          disabled={isAddingWatchlist || isAddingWatched || isAddingFavorites}
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
          disabled={isAddingWatchlist || isAddingWatched || isAddingFavorites}
          className="w-full px-4 py-4 flex items-center gap-4 hover:bg-zinc-800/50 transition disabled:opacity-50"
        >
          <Share2 className="w-6 h-6 text-gray-400" />
          <span className="text-white font-medium">Share</span>
        </button>
      </div>
    </BottomSheet>
  );
}
