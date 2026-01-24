import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { addToCollaborativeList, getCollaborativeListItems } from '@/lib/collaborative-lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/friends/[id]/collaborative-list/items - Get items in collaborative list
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const items = await getCollaborativeListItems(userId, friendUserId, { limit, offset });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error getting collaborative list items:', error);
    return NextResponse.json(
      { error: 'Failed to get items' },
      { status: 500 }
    );
  }
}

// POST /api/friends/[id]/collaborative-list/items - Add item to collaborative list
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tmdbId, mediaType, title, posterPath, releaseYear } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json(
        { error: 'tmdbId, mediaType, and title are required' },
        { status: 400 }
      );
    }

    const result = await addToCollaborativeList(userId, friendUserId, {
      tmdbId,
      mediaType,
      title,
      posterPath,
      releaseYear
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, itemId: result.itemId });
  } catch (error) {
    console.error('Error adding to collaborative list:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}
