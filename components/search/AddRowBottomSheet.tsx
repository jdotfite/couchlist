'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, TrendingUp, Tv, Calendar, Star, Heart } from 'lucide-react';
import {
  DiscoveryRowType,
  DiscoveryRowConfig,
  DiscoveryRowCategory,
} from '@/types/discovery-rows';
import StreamingServiceIcon, { STREAMING_COLORS } from '@/components/icons/StreamingServiceIcons';

interface CategoryWithRows {
  category: DiscoveryRowCategory;
  label: string;
  rows: DiscoveryRowConfig[];
}

interface AddRowBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  availableByCategory: CategoryWithRows[];
  addedRows: DiscoveryRowType[];
  onAddRow: (rowType: DiscoveryRowType) => Promise<boolean>;
}

// Map row types to streaming provider IDs for icons
const PLATFORM_PROVIDER_IDS: Record<string, number> = {
  best_on_netflix: 8,
  best_on_max: 1899,
  best_on_disney_plus: 337,
  best_on_hulu: 15,
  best_on_prime_video: 9,
  best_on_apple_tv_plus: 350,
  best_on_peacock: 386,
  best_on_paramount_plus: 531,
};

// Get icon for category
function getCategoryIcon(category: DiscoveryRowCategory) {
  switch (category) {
    case 'trending':
      return <TrendingUp className="w-4 h-4" />;
    case 'platform':
      return <Tv className="w-4 h-4" />;
    case 'new_releases':
      return <Calendar className="w-4 h-4" />;
    case 'rated':
      return <Star className="w-4 h-4" />;
    case 'moods':
      return <Heart className="w-4 h-4" />;
    default:
      return null;
  }
}

export default function AddRowBottomSheet({
  isOpen,
  onClose,
  availableByCategory,
  addedRows,
  onAddRow,
}: AddRowBottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState<DiscoveryRowType | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleAddRow = async (rowType: DiscoveryRowType) => {
    setAdding(rowType);
    const success = await onAddRow(rowType);
    setAdding(null);
    if (success) {
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-zinc-900 rounded-t-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 -ml-1 hover:bg-zinc-800 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">Add Row</h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {availableByCategory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>All rows have been added!</p>
              <p className="text-sm mt-1">Remove some rows to add new ones.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {availableByCategory.map(({ category, label, rows }) => (
                <section key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-brand-primary">{getCategoryIcon(category)}</span>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      {label}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {rows.map((row) => {
                      const isAdded = addedRows.includes(row.type);
                      const isAdding = adding === row.type;
                      const providerId = PLATFORM_PROVIDER_IDS[row.type];

                      return (
                        <button
                          key={row.type}
                          onClick={() => !isAdded && !isAdding && handleAddRow(row.type)}
                          disabled={isAdded || isAdding}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                            isAdded
                              ? 'bg-zinc-800/50 cursor-not-allowed'
                              : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                        >
                          {/* Icon for platform rows */}
                          {providerId && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: STREAMING_COLORS[providerId] || '#374151' }}
                            >
                              <StreamingServiceIcon
                                providerId={providerId}
                                size={18}
                                className="text-white"
                              />
                            </div>
                          )}

                          <div className="flex-1 text-left">
                            <div className={`font-medium ${isAdded ? 'text-gray-500' : 'text-white'}`}>
                              {row.label}
                            </div>
                            <div className="text-sm text-gray-400">{row.description}</div>
                          </div>

                          {isAdded && (
                            <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-brand-primary" />
                            </div>
                          )}
                          {isAdding && (
                            <div className="w-6 h-6 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
