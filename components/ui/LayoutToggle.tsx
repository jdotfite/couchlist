'use client';

import { List, Grid3X3 } from 'lucide-react';

export type LayoutOption = 'list' | 'grid';

interface LayoutToggleProps {
  layout: LayoutOption;
  onLayoutChange: (layout: LayoutOption) => void;
}

/**
 * Compact layout toggle - shows the icon for the view you can switch TO.
 * Tapping switches to that view.
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
        <Grid3X3 className="w-4 h-4 text-gray-400" />
      ) : (
        <List className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}
