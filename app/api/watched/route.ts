import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// Add to watched
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { media_id, media_type, title, poster_path, rating } = await request.json();

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Insert into watched
    await sql`
      INSERT INTO watched (user_id, media_id, media_type, title, poster_path, rating)
      VALUES (${userId}, ${media_id}, ${media_type}, ${title}, ${poster_path}, ${rating || null})
      ON CONFLICT (user_id, media_id, media_type) DO UPDATE
      SET watched_date = CURRENT_TIMESTAMP, rating = ${rating || null}
    `;

    // Remove from watchlist if it exists
    await sql`
      DELETE FROM watchlist 
      WHERE user_id = ${userId} AND media_id = ${media_id} AND media_type = ${media_type}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to watched:', error);
    return NextResponse.json({ error: 'Failed to add to watched' }, { status: 500 });
  }
}

// Get watched
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const userId = userResult.rows[0].id;

    const result = await sql`
      SELECT * FROM watched 
      WHERE user_id = ${userId}
      ORDER BY watched_date DESC
    `;

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error('Error fetching watched:', error);
    return NextResponse.json({ error: 'Failed to fetch watched' }, { status: 500 });
  }
}
