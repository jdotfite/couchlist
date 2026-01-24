'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Heart,
  RotateCcw,
  Sparkles,
  Check,
  Loader2,
  Eye,
} from 'lucide-react';

export interface ListOption {
  listType: string;
  listId: number | null;
  listName: string;
  itemCount: number;
  isSelected?: boolean;
}

// Simplified list option for compact selector
export interface SimpleListOption {
  id: string;
  name: string;
  type: 'system' | 'custom';
  listId?: number;
}

interface ListShareSelectorProps {
  lists: ListOption[];
  selectedLists: string[];
  onSelectionChange: (selected: string[]) => void;
  loading?: boolean;
  showItemCounts?: boolean;
  title?: string;
  description?: string;
}

const listIcons: Record<string, React.ReactNode> = {
  watchlist: <Clock className="w-5 h-5 text-blue-500" />,
  watching: <Play className="w-5 h-5 text-green-500" />,
  finished: <CheckCircle2 className="w-5 h-5 text-brand-primary" />,
  onhold: <PauseCircle className="w-5 h-5 text-yellow-500" />,
  dropped: <XCircle className="w-5 h-5 text-red-500" />,
  favorites: <Heart className="w-5 h-5 text-pink-500" />,
  rewatch: <RotateCcw className="w-5 h-5 text-cyan-500" />,
  nostalgia: <Sparkles className="w-5 h-5 text-amber-500" />,
};

const listDescriptions: Record<string, string> = {
  watchlist: 'Movies & shows to watch',
  watching: 'Currently in progress',
  finished: 'Completed titles',
  onhold: 'Paused for later',
  dropped: 'Stopped watching',
  favorites: 'All-time favorites',
  rewatch: 'Worth watching again',
  nostalgia: 'Nostalgic classics',
};

export function ListShareSelector({
  lists,
  selectedLists,
  onSelectionChange,
  loading = false,
  showItemCounts = true,
  title = 'Select lists to share',
  description = 'Choose which lists this person can see.',
}: ListShareSelectorProps) {
  const toggleList = (listType: string) => {
    if (selectedLists.includes(listType)) {
      onSelectionChange(selectedLists.filter(l => l !== listType));
    } else {
      onSelectionChange([...selectedLists, listType]);
    }
  };

  const selectAll = () => {
    onSelectionChange(lists.map(l => l.listType));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            onClick={selectAll}
            className="text-brand-primary hover:underline"
          >
            All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={selectNone}
            className="text-gray-400 hover:text-white"
          >
            None
          </button>
        </div>
      </div>

      {/* List options */}
      <div className="space-y-2">
        {lists.map(list => {
          const isSelected = selectedLists.includes(list.listType);
          const icon = listIcons[list.listType] || <Eye className="w-5 h-5 text-gray-400" />;
          const description = listDescriptions[list.listType] || '';

          return (
            <button
              key={`${list.listType}-${list.listId || 'system'}`}
              onClick={() => toggleList(list.listType)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition ${
                isSelected
                  ? 'bg-brand-primary/10 border-brand-primary'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'bg-brand-primary'
                    : 'border-2 border-zinc-600'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Icon */}
              <div className="flex-shrink-0">{icon}</div>

              {/* Label and description */}
              <div className="flex-1 text-left min-w-0">
                <div className="font-medium text-white truncate">
                  {list.listName}
                </div>
                {description && (
                  <p className="text-xs text-gray-500 truncate">{description}</p>
                )}
              </div>

              {/* Item count */}
              {showItemCounts && (
                <span className="text-sm text-gray-500 flex-shrink-0">
                  {list.itemCount} {list.itemCount === 1 ? 'item' : 'items'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      <p className="text-sm text-gray-400 mt-4 text-center">
        {selectedLists.length === 0
          ? 'No lists selected'
          : `${selectedLists.length} list${selectedLists.length === 1 ? '' : 's'} selected`}
      </p>
    </div>
  );
}

interface CompactSelectorProps {
  lists: SimpleListOption[];
  selectedIds: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

// Compact version for inline use with simplified interface
export function ListShareSelectorCompact({
  lists,
  selectedIds,
  onChange,
  disabled = false,
}: CompactSelectorProps) {
  const toggleList = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(l => l !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {lists.map(list => {
        const isSelected = selectedIds.includes(list.id);
        const icon = listIcons[list.id] || <Eye className="w-4 h-4 text-gray-400" />;

        return (
          <button
            key={list.id}
            onClick={() => toggleList(list.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isSelected
                ? 'bg-brand-primary text-white'
                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
            }`}
          >
            {icon}
            <span>{list.name}</span>
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        );
      })}
    </div>
  );
}
