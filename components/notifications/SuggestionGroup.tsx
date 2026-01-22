'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Check, X, Loader2, Plus } from 'lucide-react';
import type { GroupedSuggestions, FriendSuggestionWithDetails } from '@/types/sharing';

interface SuggestionGroupProps {
  group: GroupedSuggestions;
  onAcceptAll: (suggestionIds: number[]) => Promise<void>;
  onDismissAll: (suggestionIds: number[]) => Promise<void>;
  onAcceptSingle: (suggestion: FriendSuggestionWithDetails) => Promise<void>;
  onDismissSingle: (suggestionId: number) => Promise<void>;
}

export default function SuggestionGroup({
  group,
  onAcceptAll,
  onDismissAll,
  onAcceptSingle,
  onDismissSingle,
}: SuggestionGroupProps) {
  const [processing, setProcessing] = useState<number | 'all' | null>(null);

  const handleAcceptAll = async () => {
    setProcessing('all');
    try {
      await onAcceptAll(group.suggestions.map(s => s.id));
    } finally {
      setProcessing(null);
    }
  };

  const handleDismissAll = async () => {
    setProcessing('all');
    try {
      await onDismissAll(group.suggestions.map(s => s.id));
    } finally {
      setProcessing(null);
    }
  };

  const handleAcceptSingle = async (suggestion: FriendSuggestionWithDetails) => {
    setProcessing(suggestion.id);
    try {
      await onAcceptSingle(suggestion);
    } finally {
      setProcessing(null);
    }
  };

  const handleDismissSingle = async (suggestionId: number) => {
    setProcessing(suggestionId);
    try {
      await onDismissSingle(suggestionId);
    } finally {
      setProcessing(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 pb-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {group.from_user_image ? (
              <Image
                src={group.from_user_image}
                alt={group.from_user_name}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{group.from_user_name}</span>
              {group.from_user_username && (
                <span className="text-xs text-gray-500">@{group.from_user_username}</span>
              )}
              <span className="text-xs text-gray-500">· {formatTimeAgo(group.latest_at)}</span>
            </div>
          </div>

          {/* Add All button */}
          {group.suggestions.length > 1 && (
            <button
              onClick={handleAcceptAll}
              disabled={processing !== null}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#8b5ef4] text-white text-xs font-medium rounded-lg hover:bg-[#7a4ed3] transition disabled:opacity-50"
            >
              {processing === 'all' ? (
                <Loader2 className="w-3 h-3 animate-spin-fast" />
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Add All
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stacked items */}
      <div className="mt-2">
        {group.suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`flex items-center gap-3 px-3 py-2 ${
              index !== group.suggestions.length - 1 ? 'border-b border-zinc-700/30' : ''
            }`}
          >
            {/* Poster */}
            <Link
              href={`/${suggestion.media_type}/${suggestion.media_tmdb_id}`}
              className="relative w-10 h-[60px] rounded overflow-hidden bg-zinc-700 flex-shrink-0"
            >
              {suggestion.media_poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${suggestion.media_poster_path}`}
                  alt={suggestion.media_title}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px] text-center p-1">
                  {suggestion.media_title.substring(0, 8)}
                </div>
              )}
            </Link>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/${suggestion.media_type}/${suggestion.media_tmdb_id}`}
                className="text-sm font-medium text-white hover:text-[#8b5ef4] transition line-clamp-1"
              >
                {suggestion.media_title}
              </Link>
              <p className="text-xs text-gray-500 capitalize">
                {suggestion.media_type === 'movie' ? 'Movie' : 'TV Show'}
                {suggestion.media_release_year && ` · ${suggestion.media_release_year}`}
              </p>
              {suggestion.note && (
                <p className="text-xs text-gray-400 italic mt-0.5 line-clamp-1">
                  &ldquo;{suggestion.note}&rdquo;
                </p>
              )}
            </div>

            {/* Individual actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleAcceptSingle(suggestion)}
                disabled={processing !== null}
                className="p-2 bg-[#8b5ef4]/20 text-[#8b5ef4] rounded-full hover:bg-[#8b5ef4]/30 transition disabled:opacity-50"
                title="Add to watchlist"
              >
                {processing === suggestion.id ? (
                  <Loader2 className="w-4 h-4 animate-spin-fast" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDismissSingle(suggestion.id)}
                disabled={processing !== null}
                className="p-2 bg-zinc-700/50 text-gray-400 rounded-full hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
