import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingInvites, getPendingInviteCount } from '@/lib/invites';
import { getPendingDirectInviteCount } from '@/lib/collaborators';

// GET /api/invites/pending - Get pending invites for the current user
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
      // Count both custom list invites and direct collaboration invites
      const [customListCount, directInviteCount] = await Promise.all([
        getPendingInviteCount(userId),
        getPendingDirectInviteCount(userId),
      ]);
      return NextResponse.json({ count: customListCount + directInviteCount });
    }

    const invites = await getPendingInvites(userId);
    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
}
