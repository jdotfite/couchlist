import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingLinkInvites } from '@/lib/collaborators';

// GET /api/collaborators/pending-invites - Get pending link-based invites created by user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invites = await getPendingLinkInvites(Number(session.user.id));

    // Generate full URLs for each invite
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const invitesWithUrls = invites.map(invite => ({
      ...invite,
      inviteUrl: `${baseUrl}/invite/${invite.inviteCode}`,
    }));

    return NextResponse.json({ invites: invitesWithUrls });
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
}
