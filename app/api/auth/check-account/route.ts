import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

// POST /api/auth/check-account - Check if email exists and what auth method it uses
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await initDb();

    const result = await db`
      SELECT id, password FROM users WHERE email = ${email}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const user = result.rows[0];
    const isGoogleOnly = !user.password || user.password === '';

    return NextResponse.json({
      exists: true,
      isGoogleOnly,
    });
  } catch (error) {
    console.error('Check account error:', error);
    return NextResponse.json(
      { error: 'Failed to check account' },
      { status: 500 }
    );
  }
}
