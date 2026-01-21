'use client';

import { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Palette,
  Check,
  Loader2,
  Star,
  Calendar,
  Activity,
  CircleOff,
} from 'lucide-react';
import Image from 'next/image';
import BottomSheet from './BottomSheet';
import CoverItemPicker from './CoverItemPicker';
import { getImageUrl } from '@/lib/tmdb';
import type { CoverType, DisplayInfo, ListCardSettings } from '@/hooks/useListPreferences';

interface ListItem {
  mediaId: number;
  posterPath: string | null;
  title: string;
}

interface ListCardSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  listType: string;
  listKind: 'system' | 'custom';
  listName: string;
  listColor: string;
  listIcon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  items: ListItem[];
  settings: ListCardSettings;
  onSave: (settings: Partial<ListCardSettings>) => Promise<boolean>;
}

const coverTypeOptions: { value: CoverType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'last_added', label: 'Last added item', icon: ImageIcon },
  { value: 'color', label: 'Solid color', icon: Palette },
  { value: 'specific_item', label: 'Choose an item', icon: ImageIcon },
];

const displayInfoOptions: { value: DisplayInfo; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No additional info' },
  { value: 'rating', label: 'My rating', description: 'Show your star rating' },
  { value: 'tmdb_rating', label: 'TMDB rating', description: 'Show TMDB score' },
  { value: 'year', label: 'Year', description: 'Show release year' },
  { value: 'status', label: 'Status', description: 'Show watching status' },
];

export default function ListCardSettingsSheet({
  isOpen,
  onClose,
  listType,
  listKind,
  listName,
  listColor,
  listIcon: ListIcon,
  items,
  settings,
  onSave,
}: ListCardSettingsSheetProps) {
  const [coverType, setCoverType] = useState<CoverType>(settings.coverType);
  const [coverMediaId, setCoverMediaId] = useState<number | undefined>(settings.coverMediaId);
  const [showIcon, setShowIcon] = useState(settings.showIcon);
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo>(settings.displayInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);

  // Reset state when settings change (e.g., different list opened)
  useEffect(() => {
    setCoverType(settings.coverType);
    setCoverMediaId(settings.coverMediaId);
    setShowIcon(settings.showIcon);
    setDisplayInfo(settings.displayInfo);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave({
      coverType,
      coverMediaId: coverType === 'specific_item' ? coverMediaId : undefined,
      showIcon,
      displayInfo,
    });
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const hasChanges =
    coverType !== settings.coverType ||
    coverMediaId !== settings.coverMediaId ||
    showIcon !== settings.showIcon ||
    displayInfo !== settings.displayInfo;

  // Find selected cover item
  const selectedCoverItem = coverMediaId ? items.find(i => i.mediaId === coverMediaId) : null;

  return (
    <>
      <BottomSheet isOpen={isOpen && !showItemPicker} onClose={onClose}>
        <div className="pb-4 max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="px-4 pb-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">{listName} Settings</h2>
            <p className="text-sm text-gray-400 mt-1">Customize how this list appears</p>
          </div>

          {/* Cover Art Section */}
          <div className="px-4 py-4 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-white mb-3">Cover Art</h3>
            <div className="space-y-2">
              {coverTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = coverType === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setCoverType(option.value);
                      if (option.value === 'specific_item' && items.length > 0) {
                        setShowItemPicker(true);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      isSelected
                        ? 'bg-brand-primary/20 border border-brand-primary'
                        : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-brand-primary' : 'text-gray-400'}`} />
                    <span className={`flex-1 text-left ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {option.label}
                    </span>
                    {isSelected && <Check className="w-5 h-5 text-brand-primary" />}
                  </button>
                );
              })}
            </div>

            {/* Show selected specific item */}
            {coverType === 'specific_item' && selectedCoverItem && (
              <button
                onClick={() => setShowItemPicker(true)}
                className="mt-3 flex items-center gap-3 p-2 bg-zinc-800 rounded-lg w-full hover:bg-zinc-700 transition"
              >
                <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-zinc-700">
                  {selectedCoverItem.posterPath ? (
                    <Image
                      src={getImageUrl(selectedCoverItem.posterPath)}
                      alt={selectedCoverItem.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-white truncate">{selectedCoverItem.title}</p>
                  <p className="text-xs text-gray-400">Tap to change</p>
                </div>
              </button>
            )}

            {/* Show icon toggle (only for color cover) */}
            {coverType === 'color' && ListIcon && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${listColor}30` }}
                  >
                    <ListIcon className="w-5 h-5" style={{ color: listColor }} />
                  </div>
                  <span className="text-sm text-gray-300">Show list icon</span>
                </div>
                <button
                  onClick={() => setShowIcon(!showIcon)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    showIcon ? 'bg-brand-primary' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      showIcon ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Display Info Section */}
          <div className="px-4 py-4">
            <h3 className="text-sm font-medium text-white mb-3">Info Below Titles</h3>
            <p className="text-xs text-gray-500 mb-3">
              Choose what info to show below titles in list item views
            </p>
            <div className="space-y-2">
              {displayInfoOptions.map((option) => {
                const isSelected = displayInfo === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setDisplayInfo(option.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      isSelected
                        ? 'bg-brand-primary/20 border border-brand-primary'
                        : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <span className={`flex-1 text-left ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                    {isSelected && <Check className="w-5 h-5 text-brand-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="px-4 pt-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                hasChanges && !isSaving
                  ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
                  : 'bg-zinc-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Cover Item Picker */}
      <CoverItemPicker
        isOpen={showItemPicker}
        onClose={() => setShowItemPicker(false)}
        items={items}
        selectedMediaId={coverMediaId}
        onSelect={(mediaId) => {
          setCoverMediaId(mediaId);
          setShowItemPicker(false);
        }}
      />
    </>
  );
}
