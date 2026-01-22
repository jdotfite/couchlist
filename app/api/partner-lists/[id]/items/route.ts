import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPartnerListItems, addToPartnerList } from '@/lib/partners';

// GET /api/partner-lists/[id]/items - Get items in partner list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'all' | 'unwatched' | 'watched_together' | 'watched_solo' || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const items = await getPartnerListItems(listId, userId, { filter, limit, offset });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error getting partner list items:', error);
    return NextResponse.json({ error: 'Failed to get items' }, { status: 500 });
  }
}

// POST /api/partner-lists/[id]/items - Add item to partner list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const listId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const body = await request.json();
    const { tmdbId, mediaType, title, posterPath, releaseYear } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json({ error: 'tmdbId, mediaType, and title are required' }, { status: 400 });
    }

    if (!['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json({ error: 'mediaType must be movie or tv' }, { status: 400 });
    }

    const result = await addToPartnerList(listId, userId, {
      tmdbId,
      mediaType,
      title,
      posterPath,
      releaseYear,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      itemId: result.itemId,
    });
  } catch (error) {
    console.error('Error adding to partner list:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}
