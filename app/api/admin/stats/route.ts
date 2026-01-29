import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, initDb } from '@/lib/db';

// Admin username that can access this endpoint
const ADMIN_USERNAME = 'jdotfite';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();

    // Check if current user is admin
    const currentUser = await db`
      SELECT username FROM users WHERE id = ${Number(session.user.id)}
    `;

    if (currentUser.rows[0]?.username !== ADMIN_USERNAME) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users with their stats
    const usersResult = await db`
      SELECT
        u.id,
        u.name,
        u.email,
        u.username,
        u.profile_image,
        u.created_at,
        u.last_login,
        COALESCE(u.login_count, 0) as login_count,
        COUNT(DISTINCT um.id) as total_titles,
        COUNT(DISTINCT CASE WHEN m.media_type = 'movie' THEN um.id END) as movie_count,
        COUNT(DISTINCT CASE WHEN m.media_type = 'tv' THEN um.id END) as tv_count,
        COUNT(DISTINCT CASE WHEN um.status = 'watchlist' THEN um.id END) as watchlist_count,
        COUNT(DISTINCT CASE WHEN um.status = 'watching' THEN um.id END) as watching_count,
        COUNT(DISTINCT CASE WHEN um.status = 'finished' THEN um.id END) as finished_count
      FROM users u
      LEFT JOIN user_media um ON u.id = um.user_id
      LEFT JOIN media m ON um.media_id = m.id
      GROUP BY u.id, u.name, u.email, u.username, u.profile_image, u.created_at, u.last_login, u.login_count
      ORDER BY u.created_at DESC
    `;

    // Get total stats
    const totalStats = await db`
      SELECT
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT um.id) as total_titles_tracked,
        COUNT(DISTINCT m.id) as unique_titles
      FROM users u
      LEFT JOIN user_media um ON u.id = um.user_id
      LEFT JOIN media m ON um.media_id = m.id
    `;

    return NextResponse.json({
      users: usersResult.rows,
      stats: totalStats.rows[0],
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
