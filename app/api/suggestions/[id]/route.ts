import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSuggestion } from '@/lib/suggestions';

// GET /api/suggestions/[id] - Get single suggestion details
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
    const suggestionId = parseInt(id);
    const userId = parseInt(session.user.id);

    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const suggestion = await getSuggestion(suggestionId, userId);

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Error getting suggestion:', error);
    return NextResponse.json({ error: 'Failed to get suggestion' }, { status: 500 });
  }
}
