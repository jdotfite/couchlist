import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// Add to watching
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { media_id, media_type, title, poster_path } = await request.json();

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    await sql`
      INSERT INTO watching (user_id, media_id, media_type, title, poster_path)
      VALUES (${userId}, ${media_id}, ${media_type}, ${title}, ${poster_path})
      ON CONFLICT (user_id, media_id, media_type) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to watching:', error);
    return NextResponse.json({ error: 'Failed to add to watching' }, { status: 500 });
  }
}

// Remove from watching
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const media_id = searchParams.get('media_id');
    const media_type = searchParams.get('media_type');

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    await sql`
      DELETE FROM watching
      WHERE user_id = ${userId} AND media_id = ${media_id} AND media_type = ${media_type}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watching:', error);
    return NextResponse.json({ error: 'Failed to remove from watching' }, { status: 500 });
  }
}

// Get watching
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const userId = userResult.rows[0].id;

    const result = await sql`
      SELECT * FROM watching
      WHERE user_id = ${userId}
      ORDER BY added_date DESC
    `;

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error('Error fetching watching:', error);
    return NextResponse.json({ error: 'Failed to fetch watching' }, { status: 500 });
  }
}
