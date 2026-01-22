'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Send, Loader2, Check, X } from 'lucide-react';
import BottomSheet from '../BottomSheet';
import FriendSelector from './FriendSelector';
import { getImageUrl } from '@/lib/tmdb';

interface FriendSuggestionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string;
  releaseYear?: number | null;
}

export default function FriendSuggestionSheet({
  isOpen,
  onClose,
  mediaId,
  mediaType,
  title,
  posterPath,
  releaseYear,
}: FriendSuggestionSheetProps) {
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSend = async () => {
    if (selectedFriendIds.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserIds: selectedFriendIds,
          tmdbId: mediaId,
          mediaType,
          title,
          posterPath,
          releaseYear,
          note: note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send suggestion');
      }

      const data = await response.json();

      if (data.created > 0) {
        setResult({
          success: true,
          message: `Sent to ${data.created} friend${data.created > 1 ? 's' : ''}!`,
        });

        // Close after a short delay to show success
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else if (data.alreadyExists > 0) {
        setResult({
          success: false,
          message: 'Already suggested to selected friends',
        });
      } else if (data.alreadyOnList > 0) {
        setResult({
          success: false,
          message: 'Already in their library',
        });
      } else {
        setResult({
          success: false,
          message: 'Could not send suggestion',
        });
      }
    } catch (error) {
      console.error('Error sending suggestion:', error);
      setResult({
        success: false,
        message: 'Failed to send. Try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedFriendIds([]);
    setNote('');
    setResult(null);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      {/* Header with Media Preview */}
      <div className="flex items-center gap-3 px-4 pb-4 border-b border-zinc-800">
        <div className="relative w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
          <Image
            src={getImageUrl(posterPath)}
            alt={title}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white line-clamp-2">{title}</h3>
          <p className="text-sm text-gray-400">
            {mediaType === 'movie' ? 'Movie' : 'TV Show'}
            {releaseYear && ` (${releaseYear})`}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-zinc-800 rounded-lg transition"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Title */}
      <div className="px-4 py-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-[#8b5ef4]" />
          Send to Friend
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Select friends to share this {mediaType === 'movie' ? 'movie' : 'show'} with
        </p>
      </div>

      {/* Friend Selector */}
      <div className="px-4 max-h-[200px] overflow-y-auto">
        <FriendSelector
          selectedIds={selectedFriendIds}
          onSelectionChange={setSelectedFriendIds}
          disabled={sending}
        />
      </div>

      {/* Note Input */}
      <div className="px-4 py-3 border-t border-zinc-800 mt-3">
        <label className="block text-sm text-gray-400 mb-2">
          Add a note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          placeholder="You should check this out..."
          disabled={sending}
          className="w-full px-3 py-2 bg-zinc-800 text-white placeholder-gray-500 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#8b5ef4] disabled:opacity-50"
          rows={2}
        />
        <p className="text-xs text-gray-500 text-right mt-1">
          {note.length}/280
        </p>
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`mx-4 px-3 py-2 rounded-lg flex items-center gap-2 ${
            result.success
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {result.success ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      {/* Send Button */}
      <div className="px-4 py-4">
        <button
          onClick={handleSend}
          disabled={selectedFriendIds.length === 0 || sending || result?.success}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#8b5ef4] text-white font-medium rounded-xl hover:bg-[#7a4ed3] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin-fast" />
              Sending...
            </>
          ) : result?.success ? (
            <>
              <Check className="w-5 h-5" />
              Sent!
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send to {selectedFriendIds.length || ''} Friend
              {selectedFriendIds.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
