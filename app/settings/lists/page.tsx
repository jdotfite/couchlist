'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  XCircle,
  Clock,
  Play,
  CheckCircle2,
  PauseCircle,
  Heart,
  RotateCcw,
  Sparkles,
  Pencil,
  Check,
  X,
  RotateCw,
} from 'lucide-react';

interface ListPreference {
  listType: string;
  displayName: string;
  defaultName: string;
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

export default function ListPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [lists, setLists] = useState<ListPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPreferences();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/list-preferences');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load preferences');
        return;
      }

      setLists(data.lists || []);
    } catch (err) {
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (list: ListPreference) => {
    setEditingList(list.listType);
    setEditValue(list.displayName);
  };

  const cancelEditing = () => {
    setEditingList(null);
    setEditValue('');
  };

  const savePreference = async (listType: string) => {
    const trimmedValue = editValue.trim();
    const list = lists.find(l => l.listType === listType);

    // If value is same as current, just cancel
    if (trimmedValue === list?.displayName) {
      cancelEditing();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/list-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listType,
          displayName: trimmedValue || null, // null resets to default
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save');
        return;
      }

      // Update local state
      setLists(prev =>
        prev.map(l =>
          l.listType === listType
            ? { ...l, displayName: trimmedValue || l.defaultName }
            : l
        )
      );
      cancelEditing();
    } catch (err) {
      setError('Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async (listType: string) => {
    const list = lists.find(l => l.listType === listType);
    if (!list || list.displayName === list.defaultName) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/list-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listType,
          displayName: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to reset');
        return;
      }

      // Update local state
      setLists(prev =>
        prev.map(l =>
          l.listType === listType
            ? { ...l, displayName: l.defaultName }
            : l
        )
      );
    } catch (err) {
      setError('Failed to reset preference');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">List Names</h1>
            <p className="text-xs text-gray-400">Personalize your list names</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-6">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Info box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400">
            Rename lists to match how you think about your collection.
            Changes only affect how lists appear to you.
          </p>
        </div>

        {/* Lists */}
        <div className="space-y-3">
          {lists.map(list => (
            <div
              key={list.listType}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
            >
              {editingList === list.listType ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {listIcons[list.listType]}
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder={list.defaultName}
                      maxLength={50}
                      autoFocus
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-gray-500 mr-auto">
                      {editValue.length}/50
                    </span>
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => savePreference(list.listType)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-light rounded-lg text-sm font-medium transition flex items-center gap-1"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center gap-3">
                  {listIcons[list.listType]}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{list.displayName}</h3>
                    {list.displayName !== list.defaultName && (
                      <p className="text-xs text-gray-500">
                        Default: {list.defaultName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {list.displayName !== list.defaultName && (
                      <button
                        onClick={() => resetToDefault(list.listType)}
                        disabled={saving}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-white"
                        title="Reset to default"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => startEditing(list)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-brand-primary"
                      title="Edit name"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
