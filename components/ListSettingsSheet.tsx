'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Check,
  X,
  Loader2,
  RotateCcw,
  Play,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Heart,
  Sparkles,
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useListPreferences } from '@/hooks/useListPreferences';

interface ListSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList: () => void;
  mediaType: 'movie' | 'tv';
}

const SYSTEM_LISTS = [
  { type: 'watching', defaultName: 'Watching', icon: Play },
  { type: 'watchlist', defaultName: 'Watchlist', icon: Clock },
  { type: 'finished', defaultName: 'Finished', icon: CheckCircle2 },
  { type: 'onhold', defaultName: 'On Hold', icon: PauseCircle },
  { type: 'dropped', defaultName: 'Dropped', icon: XCircle },
  { type: 'rewatch', defaultName: 'Rewatch', icon: RotateCcw },
  { type: 'nostalgia', defaultName: 'Classics', icon: Sparkles },
  { type: 'favorites', defaultName: 'Favorites', icon: Heart },
];

export default function ListSettingsSheet({
  isOpen,
  onClose,
  onCreateList,
  mediaType,
}: ListSettingsSheetProps) {
  const { preferences, isListHidden, toggleListHidden, refetch } = useListPreferences();
  const [togglingList, setTogglingList] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingList && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingList]);

  const handleToggleHidden = async (listType: string) => {
    setTogglingList(listType);
    const currentHidden = isListHidden(listType);
    await toggleListHidden(listType, !currentHidden);
    setTogglingList(null);
  };

  const getDisplayName = (listType: string): string => {
    const pref = preferences.find(p => p.listType === listType);
    const defaultList = SYSTEM_LISTS.find(l => l.type === listType);
    return pref?.displayName || defaultList?.defaultName || listType;
  };

  const getDefaultName = (listType: string): string => {
    const defaultList = SYSTEM_LISTS.find(l => l.type === listType);
    return defaultList?.defaultName || listType;
  };

  const isCustomName = (listType: string): boolean => {
    const pref = preferences.find(p => p.listType === listType);
    const defaultName = getDefaultName(listType);
    return pref?.displayName !== undefined && pref.displayName !== defaultName;
  };

  const startEditing = (listType: string) => {
    setEditingList(listType);
    setEditValue(getDisplayName(listType));
  };

  const cancelEditing = () => {
    setEditingList(null);
    setEditValue('');
  };

  const saveNewName = async () => {
    if (!editingList || savingName) return;

    const trimmedValue = editValue.trim();
    const defaultName = getDefaultName(editingList);

    // If empty or same as default, reset to default
    const newName = trimmedValue === '' || trimmedValue === defaultName ? null : trimmedValue;

    setSavingName(true);
    try {
      const response = await fetch('/api/list-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listType: editingList,
          displayName: newName
        }),
      });

      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to save list name:', error);
    } finally {
      setSavingName(false);
      setEditingList(null);
      setEditValue('');
    }
  };

  const resetToDefault = async (listType: string) => {
    setSavingName(true);
    try {
      const response = await fetch('/api/list-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listType,
          displayName: null
        }),
      });

      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to reset list name:', error);
    } finally {
      setSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveNewName();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="pb-4 max-h-[70vh] overflow-y-auto">
        {/* Create new list button */}
        <button
          onClick={() => {
            onClose();
            onCreateList();
          }}
          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800 transition"
        >
          <Plus className="w-5 h-5 text-gray-400" />
          <span className="text-white">Create new list</span>
        </button>

        {/* System lists */}
        <div className="border-t border-zinc-800 mt-2 pt-2">
          <div className="px-4 py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">System Lists</p>
          </div>

          {SYSTEM_LISTS.map(({ type, defaultName, icon: Icon }) => {
            const hidden = isListHidden(type);
            const isToggling = togglingList === type;
            const isEditing = editingList === type;
            const hasCustomName = isCustomName(type);

            return (
              <div
                key={type}
                className={`flex items-center gap-4 px-4 py-3 ${hidden ? 'opacity-50' : ''}`}
              >
                {/* Icon */}
                <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />

                {/* Name / Edit field */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={50}
                        className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-primary min-w-0"
                        placeholder={defaultName}
                      />
                      <button
                        onClick={saveNewName}
                        disabled={savingName}
                        className="p-1 hover:bg-zinc-700 rounded text-green-500 flex-shrink-0"
                      >
                        {savingName ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 hover:bg-zinc-700 rounded text-gray-400 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-white truncate">{getDisplayName(type)}</span>
                      {hasCustomName && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({defaultName})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Reset button (only if custom name and not editing) */}
                {hasCustomName && !isEditing && (
                  <button
                    onClick={() => resetToDefault(type)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-gray-500 hover:text-gray-300 transition flex-shrink-0"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Edit button */}
                {!isEditing && (
                  <button
                    onClick={() => startEditing(type)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white transition flex-shrink-0"
                    title="Rename list"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {/* Visibility toggle */}
                <button
                  onClick={() => handleToggleHidden(type)}
                  disabled={isToggling}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                  title={hidden ? 'Show list' : 'Hide list'}
                >
                  {isToggling ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : hidden ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            );
          })}

          <p className="text-xs text-gray-500 px-4 mt-2">
            Hidden lists won't appear on your {mediaType === 'movie' ? 'movies' : 'TV shows'} page.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}
