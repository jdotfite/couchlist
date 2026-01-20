import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db, initDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await initDb();

    // Check if user already exists
    const existingUserResult = await db`
      SELECT id, password FROM users WHERE email = ${email}
    `;

    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0];

      // Check if this is a Google-only account (empty password)
      if (!existingUser.password || existingUser.password === '') {
        return NextResponse.json(
          { error: 'This email is linked to Google. Please sign in with Google instead.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db`
      INSERT INTO users (email, password, name)
      VALUES (${email}, ${hashedPassword}, ${name || null})
      RETURNING id, email, name
    `;

    return NextResponse.json(
      {
        success: true,
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
