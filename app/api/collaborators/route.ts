import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createInvite, getUserCollaborations } from '@/lib/collaborators';

// GET /api/collaborators - List all collaborations for the current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collaborations = await getUserCollaborations(Number(session.user.id));

    return NextResponse.json({ collaborations });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborations' },
      { status: 500 }
    );
  }
}

// POST /api/collaborators - Create a new invite (alias for /invite)
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const lists = body.lists || ['watchlist', 'watching', 'finished'];

    const { inviteCode, expiresAt } = await createInvite(
      Number(session.user.id),
      lists
    );

    // Generate the full invite URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${inviteCode}`;

    return NextResponse.json({
      inviteCode,
      inviteUrl,
      expiresAt,
      lists,
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}
