import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail, getItemsByStatus } from '@/lib/library';
import { db as sql } from '@/lib/db';

// GET /api/library/summary - Get all library lists in one call (for home page)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({
        watching: [],
        watchlist: [],
        finished: [],
        customListsCount: 0,
      });
    }

    // Fetch all lists and custom lists count in parallel
    const [watching, watchlist, finished, customListsResult] = await Promise.all([
      getItemsByStatus(userId, 'watching'),
      getItemsByStatus(userId, 'watchlist'),
      getItemsByStatus(userId, 'finished'),
      sql`SELECT COUNT(*) as count FROM custom_lists WHERE user_id = ${userId}`,
    ]);

    const customListsCount = parseInt(customListsResult.rows[0].count, 10);

    return NextResponse.json({
      watching,
      watchlist,
      finished,
      customListsCount,
    });
  } catch (error) {
    console.error('Error fetching library summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch library summary' },
      { status: 500 }
    );
  }
}
