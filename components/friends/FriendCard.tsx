'use client';

import { useState } from 'react';
import {
  MoreVertical,
  Trash2,
  ChevronRight,
} from 'lucide-react';

interface Friend {
  id: number; // collaborator_id
  user_id: number;
  name: string;
  username: string | null;
  image: string | null;
  connected_at: string;
}

interface FriendCardProps {
  friend: Friend;
  onRemove: (collaboratorId: number, friendName: string) => void;
}

export function FriendCard({ friend, onRemove }: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Format date as mm/dd/yy
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-3 relative">
      <div className="flex items-center gap-3">
        {/* Avatar */}
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

        {/* Options menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition text-gray-400 hover:text-white"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-[70] overflow-hidden min-w-[160px]">
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
