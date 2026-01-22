import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getConnectionsWithStats } from '@/lib/users';

// GET /api/connections - Get current user's connections with shared list stats
// Also supports ?search=query to search all users (for inviting)
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // If search query provided, search all users (not just connections)
    if (search && search.length >= 2) {
      const searchLower = search.toLowerCase();
      const result = await sql`
        SELECT id, name, username, profile_image as image
        FROM users
        WHERE id != ${userId}
        AND (
          LOWER(name) LIKE ${`%${searchLower}%`}
          OR LOWER(username) LIKE ${`%${searchLower}%`}
        )
        ORDER BY
          CASE WHEN LOWER(username) = ${searchLower} THEN 0
               WHEN LOWER(username) LIKE ${`${searchLower}%`} THEN 1
               WHEN LOWER(name) LIKE ${`${searchLower}%`} THEN 2
               ELSE 3
          END,
          name ASC
        LIMIT 10
      `;

      return NextResponse.json({ users: result.rows });
    }

    // Otherwise return existing connections
    const connections = await getConnectionsWithStats(userId);

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error getting connections:', error);
    return NextResponse.json(
      { error: 'Failed to get connections' },
      { status: 500 }
    );
  }
}
