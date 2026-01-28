'use client';

import { useState } from 'react';
import { Send, Loader2, Check, X } from 'lucide-react';
import BottomSheet from '../BottomSheet';
import FriendSelector from './FriendSelector';

interface MediaItem {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
}

interface BulkSendSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  onSuccess?: () => void;
}

export default function BulkSendSheet({
  isOpen,
  onClose,
  items,
  onSuccess,
}: BulkSendSheetProps) {
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSend = async () => {
    if (selectedFriendIds.length === 0 || items.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserIds: selectedFriendIds,
          items: items.map(item => ({
            tmdbId: item.mediaId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
          })),
          note: note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send suggestions');
      }

      const data = await response.json();

      if (data.created > 0) {
        const friendWord = selectedFriendIds.length === 1 ? 'friend' : 'friends';
        const itemWord = items.length === 1 ? 'item' : 'items';
        setResult({
          success: true,
          message: `Sent ${items.length} ${itemWord} to ${selectedFriendIds.length} ${friendWord}!`,
        });

        // Close after a short delay to show success
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 1500);
      } else if (data.alreadyExists > 0 && data.created === 0) {
        setResult({
          success: false,
          message: 'Already suggested all items to selected friends',
        });
      } else if (data.alreadyOnList > 0 && data.created === 0) {
        setResult({
          success: false,
          message: 'All items already in their library',
        });
      } else {
        setResult({
          success: false,
          message: 'Could not send suggestions',
        });
      }
    } catch (error) {
      console.error('Error sending suggestions:', error);
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

  const itemCount = items.length;
  const itemWord = itemCount === 1 ? 'item' : 'items';

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-[#8b5ef4]" />
            Send to Friend
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {itemCount} {itemWord} selected
          </p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-zinc-800 rounded-lg transition"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Friend Selector */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-500 mb-2">
          Select friends to share with
        </p>
        <div className="max-h-[200px] overflow-y-auto">
          <FriendSelector
            selectedIds={selectedFriendIds}
            onSelectionChange={setSelectedFriendIds}
            disabled={sending}
          />
        </div>
      </div>

      {/* Note Input */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <label className="block text-sm text-gray-400 mb-2">
          Add a note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          placeholder="Check these out..."
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
              ? 'bg-green-500/20 text-white'
              : 'bg-red-500/20 text-white'
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
              Send {itemCount} {itemWord} to {selectedFriendIds.length || ''} Friend
              {selectedFriendIds.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </BottomSheet>
  );
}
