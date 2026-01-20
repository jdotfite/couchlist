'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import IconPicker, { getIconComponent } from './IconPicker';
import ColorPicker, { getColorValue } from './ColorPicker';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (list: any) => void;
}

export default function CreateListModal({ isOpen, onClose, onCreated }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [color, setColor] = useState('gray');
  const [isShared, setIsShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('List name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/custom-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          is_shared: isShared,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create list');
        return;
      }

      onCreated(data.list);
      handleClose();
    } catch (err) {
      setError('Failed to create list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIcon('list');
    setColor('gray');
    setIsShared(false);
    setError(null);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const IconComponent = getIconComponent(icon);
  const colorValue = getColorValue(color);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 px-4 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create New List</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-3 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition flex items-center justify-center gap-2"
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
    </div>,
    document.body
  );
}
