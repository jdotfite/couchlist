import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getConnectionsWithStats } from '@/lib/users';

// GET /api/connections - Get current user's connections with shared list stats
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
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
