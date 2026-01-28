import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { getListItems } from '@/lib/saved-lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/saved-lists/[id]/items - Get resolved items for a list
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const items = await getListItems(userId, listId);

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('Error fetching list items:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch items';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message === 'List not found' ? 404 : 500 }
    );
  }
}
