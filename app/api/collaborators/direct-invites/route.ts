import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingDirectInvites } from '@/lib/collaborators';

// GET /api/collaborators/direct-invites - Get pending direct invites for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(session.user.id, 10);
    const invites = await getPendingDirectInvites(userId);

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching direct invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}
