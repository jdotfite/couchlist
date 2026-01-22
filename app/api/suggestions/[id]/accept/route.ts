import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptSuggestion } from '@/lib/suggestions';

// POST /api/suggestions/[id]/accept - Accept a suggestion
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
    const suggestionId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { status = 'watchlist' } = body;

    // Validate status
    const validStatuses = ['watchlist', 'watching', 'finished', 'onhold', 'dropped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await acceptSuggestion(suggestionId, userId, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      userMediaId: result.userMediaId,
    });
  } catch (error) {
    console.error('Error accepting suggestion:', error);
    return NextResponse.json({ error: 'Failed to accept suggestion' }, { status: 500 });
  }
}
