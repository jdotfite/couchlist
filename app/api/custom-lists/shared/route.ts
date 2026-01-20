import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSharedLists, leaveSharedList } from '@/lib/custom-lists';

// GET /api/custom-lists/shared - Get lists shared with the user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const lists = await getSharedLists(userId);

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Error fetching shared lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared lists' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-lists/shared - Leave a shared list
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const result = await leaveSharedList(userId, Number(listId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving shared list:', error);
    return NextResponse.json(
      { error: 'Failed to leave shared list' },
      { status: 500 }
    );
  }
}
