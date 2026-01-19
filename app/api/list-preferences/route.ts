import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getListPreferences, setListPreference, getAllListsWithNames } from '@/lib/list-preferences';

// GET /api/list-preferences - Get all list preferences for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lists = await getAllListsWithNames(Number(session.user.id));

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Error fetching list preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list preferences' },
      { status: 500 }
    );
  }
}

// PATCH /api/list-preferences - Update a list preference
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listType, displayName } = body;

    if (!listType) {
      return NextResponse.json(
        { error: 'List type is required' },
        { status: 400 }
      );
    }

    const result = await setListPreference(
      Number(session.user.id),
      listType,
      displayName || null
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating list preference:', error);
    return NextResponse.json(
      { error: 'Failed to update list preference' },
      { status: 500 }
    );
  }
}
