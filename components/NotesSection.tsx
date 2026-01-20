'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, Check, X, Edit3 } from 'lucide-react';

interface NotesSectionProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  isLoggedIn: boolean;
}

export default function NotesSection({ tmdbId, mediaType, isLoggedIn }: NotesSectionProps) {
  const [notes, setNotes] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/notes?tmdb_id=${tmdbId}&media_type=${mediaType}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
        setEditedNotes(data.notes || '');
        setIsInLibrary(data.isInLibrary ?? false);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tmdbId, mediaType, isLoggedIn]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbId,
          media_type: mediaType,
          notes: editedNotes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedNotes(notes || '');
    setIsEditing(false);
  };

  if (!isLoggedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">My Notes</h2>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
        </div>
      </div>
    );
  }

  // Don't show notes section if item is not in user's library
  if (!isInLibrary) {
    return null;
  }

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">My Notes</h2>
          {saveSuccess && (
            <span className="text-green-500 text-sm flex items-center gap-1">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary-light transition"
          >
            <Edit3 className="w-4 h-4" />
            {notes ? 'Edit' : 'Add notes'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            placeholder="Add your personal notes about this title..."
            maxLength={1000}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {editedNotes.length}/1000
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-4 py-1.5 bg-brand-primary hover:bg-brand-primary-light text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin-fast text-gray-400" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : notes ? (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{notes}</p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          No notes yet. Click "Add notes" to write your thoughts about this title.
        </p>
      )}
    </div>
  );
}
