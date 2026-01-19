import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInviteByCode } from '@/lib/collaborators';

// GET /api/collaborators/invite/[code] - Get invite details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const invite = await getInviteByCode(code);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const { collaboration, sharedLists } = invite;

    // Check if expired
    const isExpired = new Date(collaboration.invite_expires_at) < new Date();

    // Check if already used
    const isUsed = collaboration.status !== 'pending';

    // Get current user to check if they're the owner
    const session = await auth();
    const isOwnInvite = session?.user?.id && Number(session.user.id) === collaboration.owner_id;

    return NextResponse.json({
      inviter: {
        id: collaboration.owner_id,
        name: collaboration.owner_name,
      },
      sharedLists,
      expiresAt: collaboration.invite_expires_at,
      isExpired,
      isUsed,
      isOwnInvite,
      status: collaboration.status,
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    );
  }
}
