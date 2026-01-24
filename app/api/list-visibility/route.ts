import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAllListVisibility,
  setMultipleListVisibility,
  getSharedListsSummary,
  type VisibilityLevel
} from '@/lib/list-visibility';

// GET /api/list-visibility - Get all visibility settings for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const includeSummary = searchParams.get('summary') === 'true';

    const visibility = await getAllListVisibility(userId);

    if (includeSummary) {
      const summary = await getSharedListsSummary(userId);
      return NextResponse.json({ visibility, summary });
    }

    return NextResponse.json({ visibility });
  } catch (error) {
    console.error('Error getting list visibility:', error);
    return NextResponse.json(
      { error: 'Failed to get visibility settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/list-visibility - Batch update visibility for multiple lists
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    if (!body.lists || !Array.isArray(body.lists)) {
      return NextResponse.json(
        { error: 'lists array is required' },
        { status: 400 }
      );
    }

    // Validate visibility values
    const validVisibilities: VisibilityLevel[] = ['private', 'select_friends', 'friends', 'public'];
    for (const list of body.lists) {
      if (!list.listType) {
        return NextResponse.json(
          { error: 'listType is required for each list' },
          { status: 400 }
        );
      }
      if (!validVisibilities.includes(list.visibility)) {
        return NextResponse.json(
          { error: `Invalid visibility: ${list.visibility}. Must be one of: ${validVisibilities.join(', ')}` },
          { status: 400 }
        );
      }
    }

    await setMultipleListVisibility(userId, body.lists);

    const visibility = await getAllListVisibility(userId);
    return NextResponse.json({ success: true, visibility });
  } catch (error) {
    console.error('Error updating list visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update visibility settings' },
      { status: 500 }
    );
  }
}
