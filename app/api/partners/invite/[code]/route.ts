import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getInviteByCode } from '@/lib/collaborators';

// GET /api/partners/invite/[code] - Get partner invite details
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

    // Check if it's a partner invite
    if (collaboration.type !== 'partner') {
      return NextResponse.json({ error: 'Not a partner invite' }, { status: 400 });
    }

    // Check if expired
    if (new Date(collaboration.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    // Check if already used
    if (collaboration.status !== 'pending') {
      return NextResponse.json({ error: 'Invite has already been used' }, { status: 410 });
    }

    // Get suggested list name from invite_message if set
    const suggestedListName = (collaboration as any).invite_message || 'Our Watchlist';

    return NextResponse.json({
      type: 'partner',
      ownerName: collaboration.owner_name,
      ownerImage: collaboration.owner_image,
      suggestedListName,
      expiresAt: collaboration.invite_expires_at,
    });
  } catch (error) {
    console.error('Error getting partner invite:', error);
    return NextResponse.json({ error: 'Failed to get invite' }, { status: 500 });
  }
}
