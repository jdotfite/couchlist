'use client';

import { useState, useEffect } from 'react';
import {
  X,
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
  Check,
  Flag,
  Loader2,
} from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import type { FilterRules } from '@/lib/list-resolver';

interface SaveAsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterRules?: FilterRules;
  previewCount?: number;
  onCreated?: (listId: number, slug: string) => void;
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

const AVAILABLE_COLORS = Object.keys(COLOR_CLASSES);
const AVAILABLE_ICONS = Object.keys(ICON_COMPONENTS);

export default function SaveAsListModal({
  isOpen,
  onClose,
  filterRules,
  previewCount,
  onCreated,
}: SaveAsListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [color, setColor] = useState('purple');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIcon('list');
      setColor('purple');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError('Please enter a list name');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          listType: 'smart',
          filterRules: filterRules || {},
          sortBy: 'status_updated_at',
          sortDirection: 'desc',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create list');
      }

      const data = await res.json();
      showSuccess(`"${name}" created`);
      onCreated?.(data.list.id, data.list.slug);
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create list');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const IconComponent = ICON_COMPONENTS[icon] || List;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Save as List</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-xl">
            <div className={`w-12 h-12 rounded-lg ${COLOR_CLASSES[color]} flex items-center justify-center`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{name || 'New List'}</p>
              {previewCount !== undefined && (
                <p className="text-sm text-gray-400">{previewCount} items match</p>
              )}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Best of 2025"
              maxLength={50}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="My favorite movies and shows from 2025"
              maxLength={200}
              rows={2}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ICONS.map((iconKey) => {
                const Icon = ICON_COMPONENTS[iconKey];
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                      icon === iconKey
                        ? 'bg-brand-primary text-white'
                        : 'bg-zinc-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((colorKey) => (
                <button
                  key={colorKey}
                  type="button"
                  onClick={() => setColor(colorKey)}
                  className={`w-8 h-8 rounded-full ${COLOR_CLASSES[colorKey]} transition ${
                    color === colorKey
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                      : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Filter Summary */}
          {filterRules && Object.keys(filterRules).length > 0 && (
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {filterRules.status && (
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                    Status: {filterRules.status.join(', ')}
                  </span>
                )}
                {filterRules.mediaType && (
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                    Type: {filterRules.mediaType.join(', ')}
                  </span>
                )}
                {filterRules.watchedYear && (
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                    Watched in {filterRules.watchedYear}
                  </span>
                )}
                {filterRules.ratingMin && (
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                    Rating {filterRules.ratingMin}+
                  </span>
                )}
                {filterRules.isFavorite && (
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                    Favorites only
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary/90 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create List'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
