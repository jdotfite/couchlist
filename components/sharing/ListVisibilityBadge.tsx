'use client';

import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Users,
  Globe,
  ChevronDown,
  Loader2,
  Check,
  X,
  UserPlus,
} from 'lucide-react';
import type { VisibilityLevel, FriendListAccess } from '@/types/sharing';

interface ListVisibilityBadgeProps {
  listType: string;
  listId?: number | null;
  onOpenSheet?: () => void;
}

interface VisibilityData {
  visibility: VisibilityLevel;
  friends: FriendListAccess[];
  friendCount: number;
}

const visibilityConfig: Record<VisibilityLevel, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  private: {
    label: 'Private',
    icon: <EyeOff className="w-4 h-4" />,
    color: 'text-gray-400',
  },
  select_friends: {
    label: 'Select friends',
    icon: <Users className="w-4 h-4" />,
    color: 'text-brand-primary',
  },
  friends: {
    label: 'All friends',
    icon: <Users className="w-4 h-4" />,
    color: 'text-blue-400',
  },
  public: {
    label: 'Public',
    icon: <Globe className="w-4 h-4" />,
    color: 'text-green-400',
  },
};

export function ListVisibilityBadge({
  listType,
  listId = null,
  onOpenSheet,
}: ListVisibilityBadgeProps) {
  const [data, setData] = useState<VisibilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisibility();
  }, [listType, listId]);

  const fetchVisibility = async () => {
    try {
      const url = listId
        ? `/api/list-visibility/${listType}?listId=${listId}`
        : `/api/list-visibility/${listType}`;

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData({
          visibility: result.visibility,
          friends: result.friends || [],
          friendCount: result.friendCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch visibility:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const config = visibilityConfig[data.visibility];

  // Don't show badge for private lists
  if (data.visibility === 'private') {
    if (onOpenSheet) {
      return (
        <button
          onClick={onOpenSheet}
          className="flex items-center gap-1 text-gray-500 text-sm hover:text-gray-300 transition"
        >
          <EyeOff className="w-4 h-4" />
          <span>Private</span>
        </button>
      );
    }
    return null;
  }

  const label = data.visibility === 'select_friends' && data.friendCount > 0
    ? `Shared with ${data.friendCount}`
    : config.label;

  return (
    <button
      onClick={onOpenSheet}
      className={`flex items-center gap-1.5 text-sm ${config.color} hover:opacity-80 transition`}
    >
      {config.icon}
      <span>{label}</span>
      {onOpenSheet && <ChevronDown className="w-3 h-3" />}
    </button>
  );
}

// Compact inline badge - just shows visibility status without editing
// Good for showing on list cards
interface ListVisibilityInlineProps {
  listType: string;
  listId?: number | null;
}

export function ListVisibilityInline({
  listType,
  listId = null,
}: ListVisibilityInlineProps) {
  const [data, setData] = useState<VisibilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisibility();
  }, [listType, listId]);

  const fetchVisibility = async () => {
    try {
      const url = listId
        ? `/api/list-visibility/${listType}?listId=${listId}`
        : `/api/list-visibility/${listType}`;

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData({
          visibility: result.visibility,
          friends: result.friends || [],
          friendCount: result.friendCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch visibility:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Don't show loading spinner for inline badge
  }

  if (!data || data.visibility === 'private') {
    return null; // Don't show badge for private lists
  }

  const config = visibilityConfig[data.visibility];

  // Show compact badge
  const label = data.visibility === 'select_friends' && data.friendCount > 0
    ? `${data.friendCount} friends`
    : config.label;

  // Render smaller icon for compact view
  const SmallIcon = () => {
    switch (data.visibility) {
      case 'select_friends':
      case 'friends':
        return <Users className="w-3 h-3" />;
      case 'public':
        return <Globe className="w-3 h-3" />;
      default:
        return <Eye className="w-3 h-3" />;
    }
  };

  return (
    <span className={`flex items-center gap-1 text-xs ${config.color}`}>
      <SmallIcon />
      <span>{label}</span>
    </span>
  );
}

// Full editable version for settings pages
interface ListVisibilityEditableProps {
  listType: string;
  listId?: number | null;
  listName: string;
  initialVisibility?: VisibilityLevel;
  onVisibilityChange?: (visibility: VisibilityLevel) => void;
}

export function ListVisibilityEditable({
  listType,
  listId = null,
  listName,
  initialVisibility = 'private',
  onVisibilityChange,
}: ListVisibilityEditableProps) {
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newVisibility: VisibilityLevel) => {
    setSaving(true);
    setVisibility(newVisibility);

    try {
      const response = await fetch(`/api/list-visibility/${listType}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility: newVisibility,
          listId,
        }),
      });

      if (response.ok) {
        onVisibilityChange?.(newVisibility);
      }
    } catch (err) {
      console.error('Failed to update visibility:', err);
      setVisibility(visibility); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const config = visibilityConfig[visibility];

  return (
    <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={config.color}>{config.icon}</div>
        <span className="font-medium text-white">{listName}</span>
      </div>

      <div className="flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        <select
          value={visibility}
          onChange={(e) => handleChange(e.target.value as VisibilityLevel)}
          disabled={saving}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="private">Private</option>
          <option value="friends">All Friends</option>
          <option value="select_friends">Select Friends</option>
          <option value="public">Public</option>
        </select>
      </div>
    </div>
  );
}
