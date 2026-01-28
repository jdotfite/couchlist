'use client';

import { Check } from 'lucide-react';

const colors = [
  { name: 'gray', value: '#6b7280' },
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'yellow', value: '#eab308' },
  { name: 'lime', value: '#84cc16' },
  { name: 'green', value: '#22c55e' },
  { name: 'emerald', value: '#10b981' },
  { name: 'teal', value: '#14b8a6' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'sky', value: '#0ea5e9' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'indigo', value: '#6366f1' },
  { name: 'violet', value: '#8b5cf6' },
  { name: 'purple', value: '#a855f7' },
  { name: 'fuchsia', value: '#d946ef' },
  { name: 'pink', value: '#ec4899' },
  { name: 'rose', value: '#f43f5e' },
];

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export function getColorValue(name: string): string {
  const color = colors.find(c => c.name === name);
  return color?.value || '#6b7280';
}

export default function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color.name}
          type="button"
          onClick={() => onSelect(color.name)}
          className={`w-8 h-8 rounded-full transition flex items-center justify-center ${
            selected === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
          }`}
          style={{ backgroundColor: color.value }}
        >
          {selected === color.name && (
            <Check className="w-4 h-4 text-white drop-shadow-md" />
          )}
        </button>
      ))}
    </div>
  );
}
