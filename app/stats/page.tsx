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
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
import ProfileMenu from '@/components/ProfileMenu';
import ActivityHeatmap from '@/components/stats/ActivityHeatmap';

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

const CHART_COLORS = ['#8b5ef4', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

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
        <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link href="/library" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Your Stats</h1>
          </div>
        </header>
        <main className="px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-zinc-900 rounded-xl" />
            <div className="h-64 bg-zinc-900 rounded-xl" />
            <div className="h-64 bg-zinc-900 rounded-xl" />
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

  const { overview, genres, ratingDistribution, yearlyActivity, monthlyActivity, decades } = stats;

  // Prepare data for charts
  const mediaTypePieData = [
    { name: 'Movies', value: overview.totalMovies, color: '#8b5ef4' },
    { name: 'TV Shows', value: overview.totalTVShows, color: '#22c55e' },
  ];

  const statusPieData = overview.statusBreakdown.map((item) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
  }));

  const top10Genres = genres.slice(0, 10).map((g, i) => ({
    ...g,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Radar chart data (top 6 genres)
  const radarData = genres.slice(0, 6).map((g) => ({
    genre: g.genreName.split(' ')[0], // Shorten names
    count: g.count,
    fullMark: genres[0]?.count || 1,
  }));

  // Monthly activity for current year
  const monthlyData = monthlyActivity.map((item) => ({
    month: new Date(item.date + '-01').toLocaleDateString('en-US', { month: 'short' }),
    count: item.count,
  }));

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3 border-b border-zinc-800">
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

      <main className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Hero Stats */}
        <section className="bg-gradient-to-br from-brand-primary/20 to-zinc-900 rounded-2xl p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
              <Clock className="w-4 h-4" />
              Total Watch Time
            </div>
            <div className="text-5xl font-bold text-white mb-1">
              {overview.watchTime.days > 0 ? (
                <>
                  {overview.watchTime.days}<span className="text-2xl text-gray-400">d</span>{' '}
                  {overview.watchTime.hours}<span className="text-2xl text-gray-400">h</span>
                </>
              ) : (
                <>
                  {overview.watchTime.hours}<span className="text-2xl text-gray-400">h</span>{' '}
                  {overview.watchTime.minutes}<span className="text-2xl text-gray-400">m</span>
                </>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              across {overview.totalItems} titles
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <Film className="w-6 h-6 text-brand-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{overview.totalMovies}</div>
              <div className="text-xs text-gray-400">Movies</div>
            </div>
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <Tv className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{overview.totalTVShows}</div>
              <div className="text-xs text-gray-400">TV Shows</div>
            </div>
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {overview.averageRating ? overview.averageRating.toFixed(1) : '-'}
              </div>
              <div className="text-xs text-gray-400">Avg Rating</div>
            </div>
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {Math.round(overview.completionRate * 100)}%
              </div>
              <div className="text-xs text-gray-400">Completion</div>
            </div>
          </div>
        </section>

        {/* Media Type Split */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Movies vs TV Shows
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mediaTypePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {mediaTypePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {mediaTypePieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-400">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              By Status
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {statusPieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Activity Heatmap */}
        {stats.dailyActivity && stats.dailyActivity.length > 0 && (
          <section className="bg-zinc-900 rounded-xl p-4 overflow-x-auto">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Watch Activity
            </h3>
            <ActivityHeatmap data={stats.dailyActivity} />
          </section>
        )}

        {/* Genre Distribution */}
        <section className="bg-zinc-900 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Top Genres
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Genres} layout="vertical" margin={{ left: 80, right: 20 }}>
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="genreName"
                  stroke="#6b7280"
                  fontSize={12}
                  width={75}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value) => [`${value} titles`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {top10Genres.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Genre Radar */}
        {radarData.length >= 3 && (
          <section className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Your Taste Profile
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#3f3f46" />
                  <PolarAngleAxis
                    dataKey="genre"
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <PolarRadiusAxis stroke="#3f3f46" fontSize={10} />
                  <Radar
                    name="Count"
                    dataKey="count"
                    stroke="#8b5ef4"
                    fill="#8b5ef4"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Rating Distribution */}
        <section className="bg-zinc-900 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Your Ratings
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistribution} margin={{ top: 10, bottom: 5 }}>
                <XAxis
                  dataKey="rating"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}★`}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                  formatter={(value) => [`${value} titles`, 'Count']}
                  labelFormatter={(label) => `${label} stars`}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            {overview.ratedItemsCount} rated out of {overview.totalItems} titles
          </p>
        </section>

        {/* Monthly Activity */}
        {monthlyData.length > 0 && (
          <section className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              This Year&apos;s Activity
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5ef4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5ef4" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                    formatter={(value) => [`${value} titles`, 'Finished']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5ef4"
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Yearly Activity */}
        {yearlyActivity.length > 1 && (
          <section className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Year Over Year
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyActivity} margin={{ top: 10, right: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="year" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                    formatter={(value) => [`${value} titles`, 'Finished']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Decades */}
        {decades.length > 0 && (
          <section className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Favorite Decades
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decades} margin={{ top: 10, bottom: 5 }}>
                  <XAxis dataKey="decade" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                    formatter={(value) => [`${value} titles`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Manage Library Link */}
        <section className="bg-zinc-900 rounded-xl p-4">
          <Link
            href="/library/manage"
            className="flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
          >
            <div>
              <h3 className="font-medium">Manage Library</h3>
              <p className="text-sm text-gray-400">Filter and bulk edit your collection</p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </Link>
        </section>
      </main>
    </div>
  );
}
