import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInviteByCode } from '@/lib/collaborators';

// GET /api/friends/invite/[code] - Get friend invite details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const invite = await getInviteByCode(code);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const { collaboration } = invite;

    // Check if it's a friend invite
    if (collaboration.type !== 'friend') {
      return NextResponse.json({ error: 'Not a friend invite' }, { status: 400 });
    }

    // Check if expired
    if (new Date(collaboration.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    // Check if already used
    if (collaboration.status !== 'pending') {
      return NextResponse.json({ error: 'Invite has already been used' }, { status: 410 });
    }

    return NextResponse.json({
      type: 'friend',
      ownerName: collaboration.owner_name,
      ownerImage: collaboration.owner_image,
      expiresAt: collaboration.invite_expires_at,
    });
  } catch (error) {
    console.error('Error getting friend invite:', error);
    return NextResponse.json({ error: 'Failed to get invite' }, { status: 500 });
  }
}
