'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Trash2 } from 'lucide-react';
import IconPicker, { getIconComponent } from './IconPicker';
import ColorPicker, { getColorValue } from './ColorPicker';

interface CustomList {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_shared: boolean;
  item_count?: number;
}

interface EditListModalProps {
  isOpen: boolean;
  list: CustomList | null;
  onClose: () => void;
  onUpdated: (list: CustomList) => void;
  onDeleted: (slug: string) => void;
}

export default function EditListModal({
  isOpen,
  list,
  onClose,
  onUpdated,
  onDeleted,
}: EditListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [color, setColor] = useState('gray');
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
      setIcon(list.icon);
      setColor(list.color);
      setIsShared(list.is_shared);
    }
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !name.trim()) {
      setError('List name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-lists/${list.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          is_shared: isShared,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update list');
        return;
      }

      onUpdated(data.list);
      handleClose();
    } catch (err) {
      setError('Failed to update list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!list) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/custom-lists/${list.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete list');
        return;
      }

      onDeleted(list.slug);
      handleClose();
    } catch (err) {
      setError('Failed to delete list');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen || !list) return null;

  const IconComponent = getIconComponent(icon);
  const colorValue = getColorValue(color);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit List</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm ? (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">Delete "{list.name}"?</h3>
              <p className="text-sm text-gray-400">
                {list.item_count
                  ? `The ${list.item_count} items in this list will be removed from it but stay in your library.`
                  : 'This list will be permanently deleted.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {/* Preview */}
            <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded-xl">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${colorValue}20` }}
              >
                <IconComponent className="w-6 h-6" style={{ color: colorValue }} />
              </div>
              <div>
                <p className="font-medium">{name || 'List Name'}</p>
                <p className="text-sm text-gray-400">
                  {description || 'No description'}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Date Night"
                maxLength={50}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              />
              <p className="text-xs text-gray-500 mt-1">{name.length}/50</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                maxLength={200}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/200</p>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Icon
              </label>
              <IconPicker selected={icon} onSelect={setIcon} color={colorValue} />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <ColorPicker selected={color} onSelect={setColor} />
            </div>

            {/* Shared toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
              <div>
                <p className="font-medium">Share with collaborators</p>
                <p className="text-sm text-gray-400">
                  Collaborators can see and add to this list
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShared(!isShared)}
                className={`w-12 h-7 rounded-full transition ${
                  isShared ? 'bg-brand-primary' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isShared ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-red-400 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
