import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSentInvites } from '@/lib/invites';

// GET /api/invites/sent - Get invites sent by the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const invites = await getSentInvites(userId);

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching sent invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sent invites' },
      { status: 500 }
    );
  }
}
