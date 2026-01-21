import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getNotifications, getUnreadCount } from '@/lib/show-alerts';
import { NotificationType } from '@/types/notifications';

// GET /api/notifications - Get notifications for current user
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type') as NotificationType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(Number(session.user.id), {
        unreadOnly,
        type: type || undefined,
        limit: Math.min(limit, 100), // Cap at 100
        offset,
      }),
      getUnreadCount(Number(session.user.id)),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
