import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

// GET /api/user/me - Get current user's info
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const result = await sql`
      SELECT id, name, email, username, profile_image as image
      FROM users WHERE id = ${userId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      image: user.image
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
