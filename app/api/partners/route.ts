/**
 * @deprecated Partner functionality has been replaced by collaborative lists with friends.
 * These routes are kept for backwards compatibility but the UI no longer uses them.
 * Use /api/friends/[id]/collaborative-list instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPartner, hasPartner, createPartnerInvite, removePartner } from '@/lib/partners';
import { getPartnerLists } from '@/lib/partners';

// GET /api/partners - Get current partner info (DEPRECATED)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const partner = await getPartner(userId);

    if (!partner) {
      return NextResponse.json({ partner: null, lists: [] });
    }

    // Get shared lists
    const lists = await getPartnerLists(userId);

    return NextResponse.json({
      partner: {
        collaboratorId: partner.collaboratorId,
        userId: partner.userId,
        name: partner.name,
        username: partner.username,
        image: partner.image,
        connectedAt: partner.connectedAt,
      },
      lists,
    });
  } catch (error) {
    console.error('Error getting partner:', error);
    return NextResponse.json({ error: 'Failed to get partner' }, { status: 500 });
  }
}

// POST /api/partners - Create partner invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { listName } = body;

    const result = await createPartnerInvite(userId, listName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      inviteCode: result.inviteCode,
      expiresAt: result.expiresAt,
      inviteUrl: `${process.env.NEXTAUTH_URL}/invite/${result.inviteCode}?type=partner`,
    });
  } catch (error) {
    console.error('Error creating partner invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE /api/partners - Remove partner
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const result = await removePartner(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing partner:', error);
    return NextResponse.json({ error: 'Failed to remove partner' }, { status: 500 });
  }
}
