import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pollForToken, getUserProfile } from '@/lib/trakt';

// POST /api/trakt/poll-token - Poll for token after user enters code
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { device_code } = await request.json();

    if (!device_code) {
      return NextResponse.json({ error: 'device_code is required' }, { status: 400 });
    }

    const result = await pollForToken(device_code);

    // Still waiting for user to enter code
    if ('pending' in result && result.pending) {
      return NextResponse.json({ status: 'pending' });
    }

    // Got tokens! Save to database
    const tokenResult = result as { access_token: string; refresh_token: string; expires_in: number };
    const { access_token, refresh_token, expires_in } = tokenResult;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Get Trakt user profile
    const profile = await getUserProfile(access_token);

    // Upsert the connection
    await db`
      INSERT INTO user_trakt_connections (
        user_id, trakt_user_id, trakt_username,
        access_token, refresh_token, expires_at
      ) VALUES (
        ${Number(session.user.id)},
        ${profile.ids.slug},
        ${profile.username},
        ${access_token},
        ${refresh_token},
        ${expiresAt}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        trakt_user_id = EXCLUDED.trakt_user_id,
        trakt_username = EXCLUDED.trakt_username,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at
    `;

    return NextResponse.json({
      status: 'connected',
      username: profile.username,
    });
  } catch (error) {
    console.error('Error polling for Trakt token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Polling failed' },
      { status: 500 }
    );
  }
}
