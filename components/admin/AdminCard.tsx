'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Film, Tv, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface UserStats {
  id: number;
  name: string;
  email: string;
  username: string | null;
  profile_image: string | null;
  created_at: string;
  last_login: string | null;
  login_count: number;
  total_titles: number;
  movie_count: number;
  tv_count: number;
  watchlist_count: number;
  watching_count: number;
  finished_count: number;
}

interface AdminStats {
  total_users: number;
  total_titles_tracked: number;
  unique_titles: number;
}

export default function AdminCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) {
        // User is not admin, don't show error, just don't render
        setError('forbidden');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError('Failed to load admin stats');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Don't render if user is not admin
  if (error === 'forbidden') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card mb-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mb-6">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="card mb-6 border border-amber-500/30 bg-amber-500/5">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-amber-500">Admin Panel</h3>
            <p className="text-xs text-gray-400">
              {stats?.total_users} users · {stats?.total_titles_tracked} titles tracked
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.total_users}</p>
              <p className="text-xs text-gray-400">Users</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <Film className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.total_titles_tracked}</p>
              <p className="text-xs text-gray-400">Tracked</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <Tv className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.unique_titles}</p>
              <p className="text-xs text-gray-400">Unique</p>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{user.name || 'No name'}</p>
                    {user.username && (
                      <span className="text-xs text-gray-500">@{user.username}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-purple-400">{user.movie_count}</span>
                    <Film className="w-3 h-3 text-purple-400" />
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-green-400">{user.tv_count}</span>
                    <Tv className="w-3 h-3 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(user.last_login)}
                    {user.login_count > 0 && (
                      <span className="text-gray-600"> · {user.login_count} logins</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
