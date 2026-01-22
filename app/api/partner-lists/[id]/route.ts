import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPartnerList, renamePartnerList, deletePartnerList, getPartnerListItems } from '@/lib/partners';

// GET /api/partner-lists/[id] - Get partner list details with items
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

    const list = await getPartnerList(listId, userId);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') as 'all' | 'unwatched' | 'watched_together' | 'watched_solo' || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const items = await getPartnerListItems(listId, userId, { filter, limit, offset });

    return NextResponse.json({ list, items });
  } catch (error) {
    console.error('Error getting partner list:', error);
    return NextResponse.json({ error: 'Failed to get list' }, { status: 500 });
  }
}

// PATCH /api/partner-lists/[id] - Rename partner list
export async function PATCH(
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
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'List name too long (max 100 characters)' }, { status: 400 });
    }

    const result = await renamePartnerList(listId, userId, name.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming partner list:', error);
    return NextResponse.json({ error: 'Failed to rename list' }, { status: 500 });
  }
}

// DELETE /api/partner-lists/[id] - Delete partner list
export async function DELETE(
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

    const result = await deletePartnerList(listId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting partner list:', error);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
