'use client';

import { useState, useEffect } from 'react';
import {
  Check,
  Loader2,
  Plus,
  List,
  Star,
  Heart,
  Bookmark,
  Folder,
  Film,
  Tv,
  Trophy,
  Crown,
  Flame,
  Sparkles,
  Zap,
  Clock,
  Calendar,
  Eye,
  Play,
  Flag,
} from 'lucide-react';
import BottomSheet from '@/components/BottomSheet';
import { showSuccess, showError } from '@/lib/toast';

interface List {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
}

interface AddToListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  onListsChanged?: () => void;
}

// Icon mapping
const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  list: List,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  folder: Folder,
  film: Film,
  tv: Tv,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  sparkles: Sparkles,
  zap: Zap,
  clock: Clock,
  calendar: Calendar,
  eye: Eye,
  play: Play,
  check: Check,
  flag: Flag,
};

// Color classes
const COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
};

export default function AddToListSheet({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
  title,
  posterPath,
  onListsChanged,
}: AddToListSheetProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
  const [originalListIds, setOriginalListIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLists();
    }
  }, [isOpen, tmdbId, mediaType]);

  const fetchLists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/lists?tmdbId=${tmdbId}&mediaType=${mediaType}`);
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
        const containsSet = new Set<number>(data.containsMedia || []);
        setSelectedListIds(containsSet);
        setOriginalListIds(new Set(containsSet));
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleList = (listId: number) => {
    setSelectedListIds(prev => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Find lists to add (in selected but not in original)
      const toAdd = [...selectedListIds].filter(id => !originalListIds.has(id));
      // Find lists to remove (in original but not in selected)
      const toRemove = [...originalListIds].filter(id => !selectedListIds.has(id));

      // Process adds - use tmdbId/mediaType so API can create media if needed
      for (const listId of toAdd) {
        await fetch(`/api/lists/${listId}/pins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId,
            mediaType,
            title,
            posterPath,
            pinType: 'include',
          }),
        });
      }

      // Process removes
      for (const listId of toRemove) {
        await fetch(`/api/lists/${listId}/pins?tmdbId=${tmdbId}&mediaType=${mediaType}`, {
          method: 'DELETE',
        });
      }

      if (toAdd.length > 0 || toRemove.length > 0) {
        const addedCount = toAdd.length;
        const removedCount = toRemove.length;
        if (addedCount > 0 && removedCount > 0) {
          showSuccess(`Added to ${addedCount} list${addedCount > 1 ? 's' : ''}, removed from ${removedCount}`);
        } else if (addedCount > 0) {
          showSuccess(`Added to ${addedCount} list${addedCount > 1 ? 's' : ''}`);
        } else {
          showSuccess(`Removed from ${removedCount} list${removedCount > 1 ? 's' : ''}`);
        }
        onListsChanged?.();
      }

      onClose();
    } catch (error) {
      showError('Failed to update lists');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    if (selectedListIds.size !== originalListIds.size) return true;
    for (const id of selectedListIds) {
      if (!originalListIds.has(id)) return true;
    }
    return false;
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="px-4 pb-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold">Add to List</h2>
        <p className="text-sm text-gray-400 truncate">{title}</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Lists */}
      {!isLoading && (
        <div className="py-2 max-h-[50vh] overflow-y-auto">
          {lists.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-gray-400 mb-3">No lists yet</p>
              <a
                href="/lists"
                className="inline-flex items-center gap-2 text-brand-primary hover:underline"
              >
                <Plus className="w-4 h-4" />
                Create your first list
              </a>
            </div>
          ) : (
            <>
              {lists.map((list) => {
                const IconComponent = ICON_COMPONENTS[list.icon] || List;
                const colorClass = COLOR_CLASSES[list.color] || 'bg-gray-500';
                const isSelected = selectedListIds.has(list.id);

                return (
                  <button
                    key={list.id}
                    onClick={() => toggleList(list.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition"
                  >
                    <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <span className="flex-1 text-left font-medium">{list.name}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-brand-primary border-brand-primary'
                        : 'border-zinc-600'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}

              {/* Create New List Link */}
              <a
                href="/lists"
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition text-gray-400 hover:text-white"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="flex-1 text-left">Create new list</span>
              </a>
            </>
          )}
        </div>
      )}

      {/* Save Button */}
      {!isLoading && lists.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Done'
            )}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
