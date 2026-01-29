'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Film,
  Tv,
  Star,
  Play,
} from 'lucide-react';
import ProfileMenu from '@/components/ProfileMenu';

interface StatsData {
  overview: {
    totalItems: number;
    totalMovies: number;
    totalTVShows: number;
    totalEpisodesWatched: number;
    totalWatchTimeMinutes: number;
    averageRating: number | null;
    ratedItemsCount: number;
    completionRate: number;
    statusBreakdown: { status: string; count: number }[];
    watchTime: {
      days: number;
      hours: number;
      minutes: number;
      display: string;
    };
  };
  genres: {
    genreId: number;
    genreName: string;
    count: number;
    averageRating: number | null;
  }[];
  ratingDistribution: { rating: number; count: number }[];
  yearlyActivity: { year: number; count: number }[];
  monthlyActivity: { date: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
  decades: { decade: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  watching: '#22c55e',
  watchlist: '#3b82f6',
  finished: '#8b5ef4',
  onhold: '#f59e0b',
  dropped: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  watching: 'Watching',
  watchlist: 'Watchlist',
  finished: 'Finished',
  onhold: 'On Hold',
  dropped: 'Dropped',
};

const GENRE_COLORS = ['#8b5ef4', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6'];

export default function StatsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchStats();
    }
  }, [authStatus, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats?type=all');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-24">
        <header className="sticky top-0 z-10 bg-black px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Your Stats</h1>
          </div>
        </header>
        <main className="px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-zinc-900 rounded-2xl" />
              <div className="h-40 bg-zinc-900 rounded-2xl" />
            </div>
            <div className="h-48 bg-zinc-900 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Failed to load stats</p>
      </div>
    );
  }

  const { overview, genres, ratingDistribution, decades } = stats;

  // Calculate totals for percentages
  const totalItems = overview.totalItems || 1;
  const maxGenreCount = genres[0]?.count || 1;
  const maxRatingCount = Math.max(...ratingDistribution.map(r => r.count), 1);
  const maxDecadeCount = Math.max(...decades.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Your Stats</h1>
          </div>
          <ProfileMenu />
        </div>
      </header>

      <main className="px-4 space-y-4 max-w-4xl mx-auto">
        {/* Top Row - Watch Time & Library */}
        <div className="grid grid-cols-2 gap-4">
          {/* Watch Time Card */}
          <div className="bg-zinc-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-1">Watch Time</h3>
            <p className="text-zinc-500 text-xs mb-3">Total time spent</p>
            <div className="text-4xl font-bold text-white mb-1">
              {overview.watchTime.days > 0 ? (
                <>{overview.watchTime.days}<span className="text-xl text-zinc-500">d </span>{overview.watchTime.hours}<span className="text-xl text-zinc-500">h</span></>
              ) : (
                <>{overview.watchTime.hours}<span className="text-xl text-zinc-500">h </span>{overview.watchTime.minutes}<span className="text-xl text-zinc-500">m</span></>
              )}
            </div>
          </div>

          {/* Library Card */}
          <div className="bg-zinc-900 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-sm">Library</h3>
              <Link href="/library/manage" className="text-xs text-zinc-500 hover:text-white">Manage</Link>
            </div>
            <p className="text-zinc-500 text-xs mb-3">Total titles</p>
            <div className="text-4xl font-bold text-white">{overview.totalItems.toLocaleString()}</div>
          </div>
        </div>

        {/* Category Cards Row */}
        <div className="grid grid-cols-4 gap-3">
          {/* Movies */}
          <Link href="/library/manage?type=movie" className="bg-zinc-900 rounded-2xl p-4 text-center hover:bg-zinc-800 transition">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div className="text-purple-400 font-medium text-xs mb-1">Movies</div>
            <div className="text-xl font-bold">{overview.totalMovies}</div>
            <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(overview.totalMovies / totalItems) * 100}%` }}
              />
            </div>
          </Link>

          {/* TV Shows */}
          <Link href="/library/manage?type=tv" className="bg-zinc-900 rounded-2xl p-4 text-center hover:bg-zinc-800 transition">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div className="text-emerald-400 font-medium text-xs mb-1">Shows</div>
            <div className="text-xl font-bold">{overview.totalTVShows}</div>
            <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(overview.totalTVShows / totalItems) * 100}%` }}
              />
            </div>
          </Link>

          {/* Episodes */}
          <div className="bg-zinc-900 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div className="text-blue-400 font-medium text-xs mb-1">Episodes</div>
            <div className="text-xl font-bold">{overview.totalEpisodesWatched.toLocaleString()}</div>
            <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full w-full" />
            </div>
          </div>

          {/* Avg Rating */}
          <div className="bg-zinc-900 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div className="text-yellow-400 font-medium text-xs mb-1">Rating</div>
            <div className="text-xl font-bold">{overview.averageRating?.toFixed(1) || '-'}</div>
            <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full"
                style={{ width: `${((overview.averageRating || 0) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Activity Sparkline */}
        {stats.monthlyActivity && stats.monthlyActivity.length > 0 && (() => {
          const monthlyData = stats.monthlyActivity.slice(-12);
          const maxCount = Math.max(...monthlyData.map(m => m.count), 1);
          const thisMonth = monthlyData[monthlyData.length - 1]?.count || 0;
          const lastMonth = monthlyData[monthlyData.length - 2]?.count || 0;
          const change = thisMonth - lastMonth;

          // Generate sparkline path - need at least 2 points
          const width = 200;
          const height = 40;
          const padding = 2;
          const drawHeight = height - padding * 2;

          // If only one data point, show as a bar instead
          if (monthlyData.length === 1) {
            return (
              <div className="bg-zinc-900 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">Activity</h3>
                    <p className="text-zinc-500 text-xs">This month</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{thisMonth}</div>
                    <div className="text-xs text-zinc-500">titles watched</div>
                  </div>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            );
          }

          const points = monthlyData.map((item, i) => {
            const x = monthlyData.length > 1 ? (i / (monthlyData.length - 1)) * width : width / 2;
            const y = padding + drawHeight - (item.count / maxCount) * drawHeight;
            return { x, y };
          });

          const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
          const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

          const firstMonth = monthlyData[0]?.date;
          const lastMonthDate = monthlyData[monthlyData.length - 1]?.date;

          return (
            <div className="bg-zinc-900 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">Activity</h3>
                  <p className="text-zinc-500 text-xs">Last {monthlyData.length} months</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{thisMonth}</div>
                  {monthlyData.length > 1 && (
                    <div className={`text-xs flex items-center justify-end gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {change >= 0 ? '↑' : '↓'} {Math.abs(change)} vs last month
                    </div>
                  )}
                </div>
              </div>
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#sparklineGradient)" />
                <path d={linePath} fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {/* Dots at each data point */}
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ec4899" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>{firstMonth ? new Date(firstMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}</span>
                <span>{lastMonthDate ? new Date(lastMonthDate + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}</span>
              </div>
            </div>
          );
        })()}

        {/* Status Breakdown */}
        <div className="bg-zinc-900 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-1">By Status</h3>
          <p className="text-zinc-500 text-xs mb-4">How your library breaks down</p>
          <div className="space-y-3">
            {overview.statusBreakdown.map((item) => {
              const percentage = Math.round((item.count / totalItems) * 100);
              return (
                <div key={item.status} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-zinc-400">{STATUS_LABELS[item.status]}</div>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: STATUS_COLORS[item.status]
                      }}
                    />
                  </div>
                  <div className="w-16 text-right">
                    <span className="text-white font-medium">{item.count}</span>
                    <span className="text-zinc-500 text-xs ml-1">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Genres */}
        {genres.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-1">Top Genres</h3>
            <p className="text-zinc-500 text-xs mb-4">What you watch most</p>
            <div className="space-y-3">
              {genres.slice(0, 6).map((genre, index) => {
                const percentage = Math.round((genre.count / maxGenreCount) * 100);
                return (
                  <div key={genre.genreId} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-zinc-400 truncate">{genre.genreName}</div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: GENRE_COLORS[index % GENRE_COLORS.length]
                        }}
                      />
                    </div>
                    <div className="w-12 text-right text-white font-medium">{genre.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ratings Distribution */}
        <div className="bg-zinc-900 rounded-2xl p-5">
          <h3 className="text-white font-semibold text-sm mb-1">Your Ratings</h3>
          <p className="text-zinc-500 text-xs mb-4">{overview.ratedItemsCount} of {overview.totalItems} rated</p>
          <div className="flex items-end justify-between gap-2 h-32">
            {[1, 2, 3, 4, 5].map((rating) => {
              const ratingData = ratingDistribution.find(r => r.rating === rating);
              const count = ratingData?.count || 0;
              const heightPercent = (count / maxRatingCount) * 100;
              return (
                <div key={rating} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    {count > 0 && (
                      <span className="text-xs text-zinc-400 mb-1">{count}</span>
                    )}
                    <div
                      className="w-full bg-yellow-500 rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max(heightPercent, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-sm font-medium text-white">{rating}</span>
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decades */}
        {decades.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-1">By Decade</h3>
            <p className="text-zinc-500 text-xs mb-4">Release years of your titles</p>
            <div className="flex items-end justify-between gap-2 h-32">
              {decades.slice(0, 8).map((decade) => {
                const heightPercent = (decade.count / maxDecadeCount) * 100;
                return (
                  <div key={decade.decade} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      {decade.count > 0 && (
                        <span className="text-xs text-zinc-400 mb-1">{decade.count}</span>
                      )}
                      <div
                        className="w-full bg-blue-500 rounded-t-lg transition-all duration-500"
                        style={{ height: `${Math.max(heightPercent, decade.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">{decade.decade}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
