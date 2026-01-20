import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createListInvite } from '@/lib/custom-lists';

// POST /api/custom-lists/:slug/invite - Generate an invite link
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = Number(session.user.id);

    const result = await createListInvite(userId, slug);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ inviteCode: result.inviteCode });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}
