import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { markWatchedTogether } from '@/lib/partners';

// POST /api/partner-lists/[id]/items/[itemId]/watched-together - Mark as watched together
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

    const body = await request.json().catch(() => ({}));
    const { rating } = body;

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }
    }

    const result = await markWatchedTogether(itemIdNum, userId, rating);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking as watched together:', error);
    return NextResponse.json({ error: 'Failed to mark as watched together' }, { status: 500 });
  }
}
