import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/trakt/status - Get current Trakt connection status
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await db`
      SELECT
        trakt_username,
        last_synced_at,
        sync_enabled,
        created_at
      FROM user_trakt_connections
      WHERE user_id = ${Number(session.user.id)}
    `;

    if (!connections.rows[0]) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      ...connections.rows[0],
    });
  } catch (error) {
    console.error('Error fetching Trakt status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Trakt status' },
      { status: 500 }
    );
  }
}

// DELETE /api/trakt/status - Disconnect Trakt account
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db`
      DELETE FROM user_trakt_connections
      WHERE user_id = ${Number(session.user.id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Trakt:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Trakt' },
      { status: 500 }
    );
  }
}

// PATCH /api/trakt/status - Update sync settings
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sync_enabled } = await request.json();

    await db`
      UPDATE user_trakt_connections
      SET sync_enabled = ${sync_enabled}
      WHERE user_id = ${Number(session.user.id)}
    `;

    return NextResponse.json({ success: true, sync_enabled });
  } catch (error) {
    console.error('Error updating Trakt settings:', error);
    return NextResponse.json(
      { error: 'Failed to update Trakt settings' },
      { status: 500 }
    );
  }
}
