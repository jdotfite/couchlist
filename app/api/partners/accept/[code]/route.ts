import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptPartnerInvite } from '@/lib/partners';

// POST /api/partners/accept/[code] - Accept partner invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { listName = 'Our Watchlist' } = body;

    const result = await acceptPartnerInvite(code, userId, listName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      partnerListId: result.partnerListId,
    });
  } catch (error) {
    console.error('Error accepting partner invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
