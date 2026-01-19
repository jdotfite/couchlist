import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptInvite } from '@/lib/collaborators';

// POST /api/collaborators/accept/[code] - Accept an invite
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
    const body = await request.json();
    const { lists, mergeItems = true } = body;

    if (!lists || !Array.isArray(lists) || lists.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one list to share' },
        { status: 400 }
      );
    }

    const result = await acceptInvite(
      code,
      Number(session.user.id),
      lists,
      mergeItems
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
