'use client';

import {
  List,
  Folder,
  Bookmark,
  Star,
  Heart,
  Smile,
  Laugh,
  Frown,
  Ghost,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Popcorn,
  Sofa,
  Users,
  Baby,
  Gamepad2,
  Calendar,
  Clock,
  Hourglass,
  Trophy,
  Target,
  Gift,
  Music,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  list: List,
  folder: Folder,
  bookmark: Bookmark,
  star: Star,
  heart: Heart,
  smile: Smile,
  laugh: Laugh,
  frown: Frown,
  ghost: Ghost,
  flame: Flame,
  snowflake: Snowflake,
  sun: Sun,
  moon: Moon,
  popcorn: Popcorn,
  sofa: Sofa,
  users: Users,
  baby: Baby,
  gamepad: Gamepad2,
  calendar: Calendar,
  clock: Clock,
  hourglass: Hourglass,
  trophy: Trophy,
  target: Target,
  gift: Gift,
  music: Music,
};

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
  color?: string;
}

export function getIconComponent(name: string) {
  return iconMap[name] || List;
}

export default function IconPicker({ selected, onSelect, color = '#6b7280' }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Object.entries(iconMap).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={`p-3 rounded-lg transition flex items-center justify-center ${
            selected === name
              ? 'bg-brand-primary/20 ring-2 ring-brand-primary'
              : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: selected === name ? color : '#9ca3af' }}
          />
        </button>
      ))}
    </div>
  );
}
