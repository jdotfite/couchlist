'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Film, Tv, Star, ChevronRight, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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

interface GenreStats {
  genreId: number;
  genreName: string;
  count: number;
}

export default function QuickStats() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [topGenre, setTopGenre] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [overviewRes, genresRes] = await Promise.all([
        fetch('/api/stats?type=overview'),
        fetch('/api/stats?type=genres'),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setStats(data);
      }

      if (genresRes.ok) {
        const data = await genresRes.json();
        if (data.genres && data.genres.length > 0) {
          setTopGenre(data.genres[0].genreName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8 bg-zinc-900 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-24 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-zinc-800 rounded" />
          <div className="h-16 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!stats || stats.totalItems === 0) {
    return null;
  }

  const pieData = [
    { name: 'Movies', value: stats.totalMovies, color: '#8b5ef4' },
    { name: 'TV Shows', value: stats.totalTVShows, color: '#22c55e' },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-primary" />
          Your Stats
        </h2>
        <Link
          href="/stats"
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4">
        {/* Top Row - Watch Time and Pie Chart */}
        <div className="flex items-center gap-4 mb-4">
          {/* Watch Time */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Watch Time
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.watchTime.display}
            </div>
          </div>

          {/* Mini Pie Chart */}
          <div className="w-20 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={35}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          {/* Movies */}
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Film className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="text-lg font-semibold">{stats.totalMovies}</div>
            <div className="text-xs text-gray-500">Movies</div>
          </div>

          {/* TV Shows */}
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Tv className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-semibold">{stats.totalTVShows}</div>
            <div className="text-xs text-gray-500">Shows</div>
          </div>

          {/* Average Rating */}
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-lg font-semibold">
              {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
            </div>
            <div className="text-xs text-gray-500">Avg Rating</div>
          </div>

          {/* Top Genre */}
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-sm font-semibold truncate">
              {topGenre || '-'}
            </div>
            <div className="text-xs text-gray-500">Top Genre</div>
          </div>
        </div>
      </div>
    </div>
  );
}
