'use client';

import { List, Grid3X3 } from 'lucide-react';

export type LayoutOption = 'list' | 'grid';

interface LayoutToggleProps {
  layout: LayoutOption;
  onLayoutChange: (layout: LayoutOption) => void;
}

/**
 * Compact layout toggle - shows only the current view icon.
 * Tapping switches to the other view.
 */
export default function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
  const toggleLayout = () => {
    onLayoutChange(layout === 'list' ? 'grid' : 'list');
  };

  return (
    <button
      onClick={toggleLayout}
      className="flex-shrink-0 p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
      title={layout === 'list' ? 'Switch to grid view' : 'Switch to list view'}
    >
      {layout === 'list' ? (
        <List className="w-4 h-4 text-gray-400" />
      ) : (
        <Grid3X3 className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}
