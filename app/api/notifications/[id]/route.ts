import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteNotification } from '@/lib/show-alerts';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    const success = await deleteNotification(notificationId, Number(session.user.id));

    if (!success) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
