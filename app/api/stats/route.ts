import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import {
  getStatsOverview,
  getGenreStats,
  getRatingDistribution,
  getYearlyActivity,
  getMonthlyActivity,
  getDailyActivity,
  getDecadeStats,
  formatWatchTime,
} from '@/lib/stats';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview': {
        const overview = await getStatsOverview(userId);
        const watchTime = formatWatchTime(overview.totalWatchTimeMinutes);
        return NextResponse.json({
          ...overview,
          watchTime,
        });
      }

      case 'genres': {
        const genres = await getGenreStats(userId);
        return NextResponse.json({ genres });
      }

      case 'ratings': {
        const distribution = await getRatingDistribution(userId);
        return NextResponse.json({ distribution });
      }

      case 'yearly': {
        const activity = await getYearlyActivity(userId);
        return NextResponse.json({ activity });
      }

      case 'monthly': {
        const year = searchParams.get('year')
          ? parseInt(searchParams.get('year')!)
          : undefined;
        const activity = await getMonthlyActivity(userId, year);
        return NextResponse.json({ activity });
      }

      case 'daily': {
        const days = searchParams.get('days')
          ? parseInt(searchParams.get('days')!)
          : 365;
        const activity = await getDailyActivity(userId, days);
        return NextResponse.json({ activity });
      }

      case 'decades': {
        const decades = await getDecadeStats(userId);
        return NextResponse.json({ decades });
      }

      case 'all': {
        // Get everything in one request
        const [overview, genres, distribution, yearly, monthly, daily, decades] = await Promise.all([
          getStatsOverview(userId),
          getGenreStats(userId),
          getRatingDistribution(userId),
          getYearlyActivity(userId),
          getMonthlyActivity(userId),
          getDailyActivity(userId, 365),
          getDecadeStats(userId),
        ]);

        const watchTime = formatWatchTime(overview.totalWatchTimeMinutes);

        return NextResponse.json({
          overview: { ...overview, watchTime },
          genres,
          ratingDistribution: distribution,
          yearlyActivity: yearly,
          monthlyActivity: monthly,
          dailyActivity: daily,
          decades,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid stats type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
