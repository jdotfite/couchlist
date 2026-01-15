'use client';

import { X, Trash2, Heart, List, CheckCircle2, Share2, Info } from 'lucide-react';
import Image from 'next/image';

interface ItemOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: number;
    media_id: number;
    media_type: string;
    title: string;
    poster_path: string;
  } | null;
  currentList: string;
  onRemove?: (mediaId: number, mediaType: string) => void;
  onAddToWatchlist?: (item: any) => void;
  onAddToWatched?: (item: any) => void;
  onAddToFavorites?: (item: any) => void;
}

export default function ItemOptionsSheet({
  isOpen,
  onClose,
  item,
  currentList,
  onRemove,
  onAddToWatchlist,
  onAddToWatched,
  onAddToFavorites,
}: ItemOptionsSheetProps) {
  if (!item) return null;

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.media_id, item.media_type);
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-zinc-900 rounded-t-2xl z-50 transform transition-transform duration-300 ease-out ${
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
        <div className="py-2">
          {currentList !== 'watchlist' && onAddToWatchlist && (
            <button
              onClick={() => {
                onAddToWatchlist(item);
                onClose();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800 transition"
            >
              <List className="w-6 h-6 text-blue-500" />
              <span>Add to Watchlist</span>
            </button>
          )}

          {currentList !== 'watched' && onAddToWatched && (
            <button
              onClick={() => {
                onAddToWatched(item);
                onClose();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800 transition"
            >
              <CheckCircle2 className="w-6 h-6 text-[#8b5ef4]" />
              <span>Mark as Watched</span>
            </button>
          )}

          {currentList !== 'favorites' && onAddToFavorites && (
            <button
              onClick={() => {
                onAddToFavorites(item);
                onClose();
              }}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800 transition"
            >
              <Heart className="w-6 h-6 text-pink-500" />
              <span>Add to Favorites</span>
            </button>
          )}

          <a
            href={`/${item.media_type}/${item.media_id}`}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800 transition"
          >
            <Info className="w-6 h-6 text-gray-400" />
            <span>View Details</span>
          </a>

          <button
            onClick={() => {}}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800 transition"
          >
            <Share2 className="w-6 h-6 text-gray-400" />
            <span>Share</span>
          </button>

          {onRemove && (
            <button
              onClick={handleRemove}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-800 transition text-red-500"
            >
              <Trash2 className="w-6 h-6" />
              <span>Remove from {currentList === 'watchlist' ? 'Watchlist' : currentList === 'watched' ? 'Watched' : 'Favorites'}</span>
            </button>
          )}
        </div>

        {/* Safe area padding */}
        <div className="h-8" />
      </div>
    </>
  );
}
