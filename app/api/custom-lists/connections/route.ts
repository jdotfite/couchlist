import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExistingConnections } from '@/lib/custom-lists';

// GET /api/custom-lists/connections - Get existing connections for quick adding
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const connections = await getExistingConnections(userId);

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
