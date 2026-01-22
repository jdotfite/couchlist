import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUnreadCount } from '@/lib/show-alerts';
import { getPendingInviteCount } from '@/lib/invites';
import { getPendingDirectInviteCount } from '@/lib/collaborators';
import { getSuggestionCount } from '@/lib/suggestions';

// GET /api/notifications/summary - Get all notification counts in one call
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);

    // Fetch all counts in parallel
    const [notificationCount, customListInviteCount, directInviteCount, suggestionCount] = await Promise.all([
      getUnreadCount(userId),
      getPendingInviteCount(userId),
      getPendingDirectInviteCount(userId),
      getSuggestionCount(userId),
    ]);

    const inviteCount = customListInviteCount + directInviteCount;
    const total = notificationCount + inviteCount + suggestionCount;

    return NextResponse.json({
      notificationCount,
      inviteCount,
      suggestionCount,
      total,
    });
  } catch (error) {
    console.error('Error fetching notification summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification summary' },
      { status: 500 }
    );
  }
}
