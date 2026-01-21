import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUnreadCount } from '@/lib/show-alerts';

// GET /api/notifications/count - Get unread notification count
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await getUnreadCount(Number(session.user.id));

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    );
  }
}
