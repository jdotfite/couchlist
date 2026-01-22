import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dismissSuggestion } from '@/lib/suggestions';

// POST /api/suggestions/[id]/dismiss - Dismiss a suggestion
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

    const result = await dismissSuggestion(suggestionId, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    return NextResponse.json({ error: 'Failed to dismiss suggestion' }, { status: 500 });
  }
}
