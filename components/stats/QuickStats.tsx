'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Film, Tv, Star, ChevronRight, Play } from 'lucide-react';

interface StatsOverview {
  totalItems: number;
  totalMovies: number;
  totalTVShows: number;
  totalEpisodesWatched: number;
  averageRating: number | null;
  ratedItemsCount: number;
  watchTime: {
    days: number;
    hours: number;
    minutes: number;
    display: string;
  };
}

export default function QuickStats() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const overviewRes = await fetch('/api/stats?type=overview');
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4 animate-pulse">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-zinc-900 rounded-2xl" />
          <div className="h-24 bg-zinc-900 rounded-2xl" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="h-28 bg-zinc-900 rounded-2xl" />
          <div className="h-28 bg-zinc-900 rounded-2xl" />
          <div className="h-28 bg-zinc-900 rounded-2xl" />
          <div className="h-28 bg-zinc-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalItems === 0) {
    return null;
  }

  const totalItems = stats.totalItems || 1;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Your Stats</h2>
        <Link
          href="/stats"
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top Row - Watch Time & Library */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Watch Time Card */}
        <div className="bg-zinc-900 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <Clock className="w-3.5 h-3.5" />
            Watch Time
          </div>
          <div className="text-3xl font-bold text-white">
            {stats.watchTime.days > 0 ? (
              <>{stats.watchTime.days}<span className="text-lg text-zinc-500">d </span>{stats.watchTime.hours}<span className="text-lg text-zinc-500">h</span></>
            ) : (
              <>{stats.watchTime.hours}<span className="text-lg text-zinc-500">h </span>{stats.watchTime.minutes}<span className="text-lg text-zinc-500">m</span></>
            )}
          </div>
        </div>

        {/* Library Card */}
        <div className="bg-zinc-900 rounded-2xl p-4">
          <div className="text-zinc-500 text-xs mb-2">Total Titles</div>
          <div className="text-3xl font-bold text-white">{stats.totalItems.toLocaleString()}</div>
        </div>
      </div>

      {/* Category Cards Row */}
      <div className="grid grid-cols-4 gap-3">
        {/* Movies */}
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Film className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold">{stats.totalMovies}</div>
          <div className="text-xs text-zinc-500">Movies</div>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(stats.totalMovies / totalItems) * 100}%` }}
            />
          </div>
        </div>

        {/* TV Shows */}
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Tv className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold">{stats.totalTVShows}</div>
          <div className="text-xs text-zinc-500">Shows</div>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(stats.totalTVShows / totalItems) * 100}%` }}
            />
          </div>
        </div>

        {/* Episodes */}
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Play className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold">{stats.totalEpisodesWatched.toLocaleString()}</div>
          <div className="text-xs text-zinc-500">Episodes</div>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full w-full" />
          </div>
        </div>

        {/* Avg Rating */}
        <div className="bg-zinc-900 rounded-2xl p-3 text-center">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-lg font-bold">{stats.averageRating?.toFixed(1) || '-'}</div>
          <div className="text-xs text-zinc-500">Rating</div>
          <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full"
              style={{ width: `${((stats.averageRating || 0) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
