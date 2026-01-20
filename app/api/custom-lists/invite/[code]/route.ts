import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getListInvite, acceptListInvite } from '@/lib/custom-lists';

// GET /api/custom-lists/invite/:code - Get invite details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const invite = await getListInvite(code);

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    return NextResponse.json({
      list: {
        name: invite.list.name,
        description: invite.list.description,
        icon: invite.list.icon,
        color: invite.list.color,
      },
      owner: {
        name: invite.owner.name,
      },
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    );
  }
}

// POST /api/custom-lists/invite/:code - Accept an invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const userId = Number(session.user.id);

    const result = await acceptListInvite(userId, code);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      list: result.list,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
