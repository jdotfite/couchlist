import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { clearAllNotifications } from '@/lib/show-alerts';

// POST /api/notifications/clear - Clear notifications
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const readOnly = body.readOnly === true;

    const deletedCount = await clearAllNotifications(
      Number(session.user.id),
      readOnly
    );

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    );
  }
}
