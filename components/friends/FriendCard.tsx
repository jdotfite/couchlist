'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  Trash2,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Eye,
} from 'lucide-react';

interface Friend {
  id: number; // collaborator_id
  user_id: number;
  name: string;
  username: string | null;
  image: string | null;
  connected_at: string;
}

interface SharingStats {
  youShareCount: number;
  theyShareCount: number;
}

interface FriendCardProps {
  friend: Friend;
  onManageSharing: (friendUserId: number) => void;
  onRemove: (collaboratorId: number, friendName: string) => void;
}

export function FriendCard({ friend, onManageSharing, onRemove }: FriendCardProps) {
  const [stats, setStats] = useState<SharingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchSharingStats();
  }, [friend.user_id]);

  const fetchSharingStats = async () => {
    try {
      const response = await fetch(`/api/friends/${friend.user_id}/sharing-summary`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          youShareCount: data.youShareCount || 0,
          theyShareCount: data.theyShareCount || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch sharing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasSharedLists = (stats?.theyShareCount ?? 0) > 0;

  // Format date as dd/mm/yy
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-3 relative">
      <div className="flex items-center gap-3">
        {/* Avatar - matches pending card style */}
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {friend.image ? (
            <img
              src={friend.image}
              alt={friend.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold">
              {friend.name?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name and meta */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{friend.name}</p>
          <p className="text-xs text-gray-400">
            {friend.username && <span>@{friend.username} · </span>}
            Friends since {formatDate(friend.connected_at)}
          </p>
        </div>

        {/* Inline sharing stats */}
        <div className="flex items-center gap-3 text-sm flex-shrink-0">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
          ) : (
            <>
              <div className="flex items-center gap-1" title="Lists you share">
                <ArrowUpRight className="w-3.5 h-3.5 text-brand-primary" />
                <span className="text-gray-400 font-medium">{stats?.youShareCount || 0}</span>
              </div>
              <div className="flex items-center gap-1" title="Lists they share">
                <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-gray-400 font-medium">{stats?.theyShareCount || 0}</span>
              </div>
            </>
          )}
        </div>

        {/* Options menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition text-gray-400 hover:text-white"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-[70] overflow-hidden min-w-[180px]">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onManageSharing(friend.user_id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-700 transition text-left"
                >
                  <Share2 className="w-4 h-4 text-brand-primary" />
                  <span className="text-sm">Manage Sharing</span>
                </button>

                {hasSharedLists && (
                  <Link
                    href={`/friends/${friend.user_id}`}
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-700 transition text-left"
                  >
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">View Their Lists</span>
                  </Link>
                )}

                <div className="border-t border-zinc-700" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRemove(friend.id, friend.name);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-zinc-700 transition text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Remove Friend</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller displays or lists
interface FriendCardCompactProps {
  friend: Friend;
  onClick: () => void;
}

export function FriendCardCompact({ friend, onClick }: FriendCardCompactProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition text-left"
    >
      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        {friend.image ? (
          <img
            src={friend.image}
            alt={friend.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-semibold">
            {friend.name?.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate">{friend.name}</h3>
        {friend.username && (
          <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
        )}
      </div>

      <ChevronRight className="w-5 h-5 text-gray-500" />
    </button>
  );
}
