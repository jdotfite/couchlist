import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { acceptMultipleSuggestions, dismissMultipleSuggestions } from '@/lib/suggestions';

// POST /api/suggestions/batch-accept - Accept multiple suggestions at once
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { suggestionIds, status = 'watchlist', action = 'accept' } = body;

    if (!suggestionIds || !Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return NextResponse.json({ error: 'suggestionIds is required and must be a non-empty array' }, { status: 400 });
    }

    const ids = suggestionIds.map((id: number | string) => parseInt(String(id)));

    if (action === 'dismiss') {
      const result = await dismissMultipleSuggestions(ids, userId);
      return NextResponse.json({
        success: true,
        dismissed: result.dismissed,
        failed: result.failed,
      });
    }

    // Default: accept
    const validStatuses = ['watchlist', 'watching', 'finished', 'onhold', 'dropped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const result = await acceptMultipleSuggestions(ids, userId, status);

    return NextResponse.json({
      success: true,
      accepted: result.accepted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error batch processing suggestions:', error);
    return NextResponse.json({ error: 'Failed to process suggestions' }, { status: 500 });
  }
}
