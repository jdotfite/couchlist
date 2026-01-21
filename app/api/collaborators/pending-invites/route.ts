import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingLinkInvites, getPendingSentDirectInvites } from '@/lib/collaborators';

// GET /api/collaborators/pending-invites - Get all pending invites created by user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const [linkInvites, directInvites] = await Promise.all([
      getPendingLinkInvites(userId),
      getPendingSentDirectInvites(userId),
    ]);

    // Generate full URLs for link invites
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const linkInvitesWithUrls = linkInvites.map(invite => ({
      ...invite,
      type: 'link' as const,
      inviteUrl: `${baseUrl}/invite/${invite.inviteCode}`,
    }));

    // Add type to direct invites
    const directInvitesWithType = directInvites.map(invite => ({
      ...invite,
      type: 'direct' as const,
    }));

    return NextResponse.json({
      invites: linkInvitesWithUrls,
      directInvites: directInvitesWithType,
    });
  } catch (error) {
    console.error('Error fetching pending invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invites' },
      { status: 500 }
    );
  }
}
