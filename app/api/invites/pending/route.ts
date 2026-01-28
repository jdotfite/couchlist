import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingDirectInviteCount, getPendingDirectInvites } from '@/lib/collaborators';

// GET /api/invites/pending - Get pending friend/collaboration invites for the current user
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    const userId = Number(session.user.id);

    if (countOnly) {
      const count = await getPendingDirectInviteCount(userId);
      return NextResponse.json({ count });
    }

    const invites = await getPendingDirectInvites(userId);
    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
}
