import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// GET /api/library/counts - Get item counts for each list type
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);

    // Get counts for each status type
    const result = await sql`
      SELECT status, COUNT(*)::int as count
      FROM user_media
      WHERE user_id = ${userId}
      GROUP BY status
    `;

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.status] = row.count;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching library counts:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
