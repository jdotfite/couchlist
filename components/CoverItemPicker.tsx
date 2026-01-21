'use client';

import { Check, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { getImageUrl } from '@/lib/tmdb';

interface ListItem {
  mediaId: number;
  posterPath: string | null;
  title: string;
}

interface CoverItemPickerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ListItem[];
  selectedMediaId?: number;
  onSelect: (mediaId: number) => void;
}

export default function CoverItemPicker({
  isOpen,
  onClose,
  items,
  selectedMediaId,
  onSelect,
}: CoverItemPickerProps) {
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-zinc-900 rounded-t-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-zinc-800 flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">Choose Cover</h2>
            <p className="text-sm text-gray-400">Select an item to use as the list cover</p>
          </div>
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto pb-8">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>No items in this list yet</p>
              <p className="text-sm mt-1">Add some items to choose a cover</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-4">
              {items.map((item) => {
                const isSelected = item.mediaId === selectedMediaId;

                return (
                  <button
                    key={item.mediaId}
                    onClick={() => onSelect(item.mediaId)}
                    className={`relative aspect-[2/3] rounded-lg overflow-hidden transition ${
                      isSelected
                        ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-zinc-900'
                        : 'hover:ring-2 hover:ring-zinc-600 hover:ring-offset-2 hover:ring-offset-zinc-900'
                    }`}
                  >
                    {item.posterPath ? (
                      <Image
                        src={getImageUrl(item.posterPath)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-xs text-gray-500 text-center px-1">
                          No image
                        </span>
                      </div>
                    )}

                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-brand-primary/30 flex items-center justify-center">
                        <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Title overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white line-clamp-2">{item.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
