import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { media_id, media_type, title, poster_path } = await request.json();

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // Add to favorites
    await sql`
      INSERT INTO favorites (user_id, media_id, media_type, title, poster_path)
      VALUES (${userId}, ${media_id}, ${media_type}, ${title}, ${poster_path})
      ON CONFLICT (user_id, media_id, media_type) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add to favorites:', error);
    return NextResponse.json({ error: 'Failed to add to favorites' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    const result = await sql`
      SELECT * FROM favorites 
      WHERE user_id = ${userId}
      ORDER BY added_date DESC
    `;

    return NextResponse.json({ favorites: result.rows });
  } catch (error) {
    console.error('Failed to fetch favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('media_id');
    const mediaType = searchParams.get('media_type');

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    await sql`
      DELETE FROM favorites 
      WHERE user_id = ${userId} 
      AND media_id = ${mediaId} 
      AND media_type = ${mediaType}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove from favorites:', error);
    return NextResponse.json({ error: 'Failed to remove from favorites' }, { status: 500 });
  }
}
