import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { addListPin, removeListPin } from '@/lib/saved-lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/saved-lists/[id]/pins - Add a pin to a list
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { mediaId, pinType } = body;

    if (!mediaId || typeof mediaId !== 'number') {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    if (!pinType || !['include', 'exclude'].includes(pinType)) {
      return NextResponse.json(
        { error: 'Pin type must be "include" or "exclude"' },
        { status: 400 }
      );
    }

    await addListPin(userId, listId, mediaId, pinType);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding pin:', error);
    const message = error instanceof Error ? error.message : 'Failed to add pin';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// DELETE /api/saved-lists/[id]/pins - Remove a pin from a list
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const listId = parseInt(id, 10);

    if (isNaN(listId)) {
      return NextResponse.json({ error: 'Invalid list ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const mediaIdStr = searchParams.get('mediaId');

    if (!mediaIdStr) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const mediaId = parseInt(mediaIdStr, 10);
    if (isNaN(mediaId)) {
      return NextResponse.json(
        { error: 'Invalid media ID' },
        { status: 400 }
      );
    }

    await removeListPin(userId, listId, mediaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing pin:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove pin';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
