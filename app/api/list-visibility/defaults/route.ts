import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getDefaultSharingPreferences,
  setDefaultSharingPreferences,
  SYSTEM_LIST_TYPES
} from '@/lib/list-visibility';

// GET /api/list-visibility/defaults - Get default sharing preferences
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const defaults = await getDefaultSharingPreferences(userId);

    // Build a complete list with all system lists showing their default status
    const systemListDefaults = SYSTEM_LIST_TYPES.map(listType => {
      const existing = defaults.find(d => d.listType === listType && d.listId === null);
      return {
        listType,
        listId: null,
        shareByDefault: existing?.shareByDefault ?? false
      };
    });

    // Get custom list defaults (any with listId !== null)
    const customListDefaults = defaults.filter(d => d.listId !== null);

    return NextResponse.json({
      systemLists: systemListDefaults,
      customLists: customListDefaults
    });
  } catch (error) {
    console.error('Error getting default sharing preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get defaults' },
      { status: 500 }
    );
  }
}

// PATCH /api/list-visibility/defaults - Update default sharing preferences
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

    // Validate each list has required fields
    for (const list of body.lists) {
      if (!list.listType) {
        return NextResponse.json(
          { error: 'listType is required for each list' },
          { status: 400 }
        );
      }
      if (typeof list.shareByDefault !== 'boolean') {
        return NextResponse.json(
          { error: 'shareByDefault (boolean) is required for each list' },
          { status: 400 }
        );
      }
    }

    await setDefaultSharingPreferences(userId, body.lists);

    const defaults = await getDefaultSharingPreferences(userId);

    // Build response with system lists
    const systemListDefaults = SYSTEM_LIST_TYPES.map(listType => {
      const existing = defaults.find(d => d.listType === listType && d.listId === null);
      return {
        listType,
        listId: null,
        shareByDefault: existing?.shareByDefault ?? false
      };
    });

    const customListDefaults = defaults.filter(d => d.listId !== null);

    return NextResponse.json({
      success: true,
      systemLists: systemListDefaults,
      customLists: customListDefaults
    });
  } catch (error) {
    console.error('Error updating default sharing preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update defaults' },
      { status: 500 }
    );
  }
}
