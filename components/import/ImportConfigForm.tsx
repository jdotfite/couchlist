'use client';

import { Info } from 'lucide-react';
import type { ConflictStrategy } from '@/types/import';

interface ImportConfigFormProps {
  conflictStrategy: ConflictStrategy;
  importRatings: boolean;
  importWatchlist: boolean;
  importWatched: boolean;
  markRewatchAsTag: boolean;
  onChange: (config: {
    conflictStrategy: ConflictStrategy;
    importRatings: boolean;
    importWatchlist: boolean;
    importWatched: boolean;
    markRewatchAsTag: boolean;
  }) => void;
  disabled?: boolean;
}

export default function ImportConfigForm({
  conflictStrategy,
  importRatings,
  importWatchlist,
  importWatched,
  markRewatchAsTag,
  onChange,
  disabled = false,
}: ImportConfigFormProps) {
  const handleChange = (key: string, value: boolean | string) => {
    onChange({
      conflictStrategy,
      importRatings,
      importWatchlist,
      importWatched,
      markRewatchAsTag,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* What to Import */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">What to Import</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importWatched}
              onChange={(e) => handleChange('importWatched', e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white">Watched movies</span>
              <p className="text-xs text-gray-500">Movies you have already seen</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importWatchlist}
              onChange={(e) => handleChange('importWatchlist', e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white">Watchlist</span>
              <p className="text-xs text-gray-500">Movies you want to watch</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importRatings}
              onChange={(e) => handleChange('importRatings', e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white">Import ratings</span>
              <p className="text-xs text-gray-500">Letterboxd 5-star ratings will be converted to FlickLog scale</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={markRewatchAsTag}
              onChange={(e) => handleChange('markRewatchAsTag', e.target.checked)}
              disabled={disabled}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white">Mark rewatches</span>
              <p className="text-xs text-gray-500">Tag diary rewatches with the Rewatch tag</p>
            </div>
          </label>
        </div>
      </div>

      {/* Conflict Resolution */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          If a movie already exists in your library
        </h3>
        <div className="space-y-2">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-pointer hover:bg-zinc-800 transition">
            <input
              type="radio"
              name="conflictStrategy"
              value="skip"
              checked={conflictStrategy === 'skip'}
              onChange={() => handleChange('conflictStrategy', 'skip')}
              disabled={disabled}
              className="mt-1 w-4 h-4 border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white font-medium">Skip</span>
              <p className="text-xs text-gray-500">Keep your existing data, skip duplicates</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-pointer hover:bg-zinc-800 transition">
            <input
              type="radio"
              name="conflictStrategy"
              value="overwrite"
              checked={conflictStrategy === 'overwrite'}
              onChange={() => handleChange('conflictStrategy', 'overwrite')}
              disabled={disabled}
              className="mt-1 w-4 h-4 border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white font-medium">Overwrite</span>
              <p className="text-xs text-gray-500">Replace your existing rating with the imported one</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 cursor-pointer hover:bg-zinc-800 transition">
            <input
              type="radio"
              name="conflictStrategy"
              value="keep_higher_rating"
              checked={conflictStrategy === 'keep_higher_rating'}
              onChange={() => handleChange('conflictStrategy', 'keep_higher_rating')}
              disabled={disabled}
              className="mt-1 w-4 h-4 border-zinc-600 bg-zinc-800 text-brand-primary
                focus:ring-brand-primary focus:ring-offset-zinc-900 disabled:opacity-50"
            />
            <div>
              <span className="text-white font-medium">Keep higher rating</span>
              <p className="text-xs text-gray-500">Only update if the imported rating is higher</p>
            </div>
          </label>
        </div>
      </div>

      {/* Info box */}
      <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-start gap-2">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          Letterboxd ratings are converted: 0.5-1 stars = 1, 1.5-2 = 2, 2.5-3 = 3, 3.5-4 = 4, 4.5-5 = 5
        </p>
      </div>
    </div>
  );
}
