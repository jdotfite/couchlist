import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateItemStatus, markWatchedSolo, unmarkWatched } from '@/lib/partners';

// PATCH /api/partner-lists/[id]/items/[itemId]/status - Update your status on an item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const itemIdNum = parseInt(itemId);
    const userId = parseInt(session.user.id);

    if (isNaN(itemIdNum)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { watched, rating } = body;

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }
    }

    const result = await updateItemStatus(itemIdNum, userId, { watched, rating });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating item status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

// POST /api/partner-lists/[id]/items/[itemId]/status - Mark as watched (solo)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const itemIdNum = parseInt(itemId);
    const userId = parseInt(session.user.id);

    if (isNaN(itemIdNum)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { rating } = body;

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }
    }

    const result = await markWatchedSolo(itemIdNum, userId, rating);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking as watched:', error);
    return NextResponse.json({ error: 'Failed to mark as watched' }, { status: 500 });
  }
}

// DELETE /api/partner-lists/[id]/items/[itemId]/status - Unmark as watched
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const itemIdNum = parseInt(itemId);
    const userId = parseInt(session.user.id);

    if (isNaN(itemIdNum)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const result = await unmarkWatched(itemIdNum, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unmarking watched:', error);
    return NextResponse.json({ error: 'Failed to unmark' }, { status: 500 });
  }
}
