import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ statuses: {} });
    }

    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    // Limit to 50 items per request
    const limitedItems = items.slice(0, 50);

    // Build query to get status for all items
    const conditions = limitedItems.map((item: { tmdbId: number; mediaType: string }) =>
      `(m.tmdb_id = ${Number(item.tmdbId)} AND m.media_type = '${item.mediaType === 'movie' ? 'movie' : 'tv'}')`
    ).join(' OR ');

    const result = await sql.query(`
      SELECT
        m.tmdb_id,
        m.media_type,
        um.status
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      WHERE um.user_id = ${session.user.id}
        AND (${conditions})
    `);

    // Build response map
    const statuses: Record<string, string> = {};
    for (const row of result.rows) {
      const key = `${row.media_type}-${row.tmdb_id}`;
      statuses[key] = row.status;
    }

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Batch status error:', error);
    return NextResponse.json({ statuses: {} });
  }
}
