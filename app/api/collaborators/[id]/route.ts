import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { removeCollaboration, updateSharedLists } from '@/lib/collaborators';

// DELETE /api/collaborators/[id] - Remove a collaboration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const collaborationId = parseInt(id, 10);

    if (isNaN(collaborationId)) {
      return NextResponse.json({ error: 'Invalid collaboration ID' }, { status: 400 });
    }

    const result = await removeCollaboration(
      collaborationId,
      Number(session.user.id)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaboration' },
      { status: 500 }
    );
  }
}

// PATCH /api/collaborators/[id] - Update shared lists
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const collaborationId = parseInt(id, 10);

    if (isNaN(collaborationId)) {
      return NextResponse.json({ error: 'Invalid collaboration ID' }, { status: 400 });
    }

    const body = await request.json();
    const { lists } = body;

    if (!lists || !Array.isArray(lists)) {
      return NextResponse.json(
        { error: 'Lists array is required' },
        { status: 400 }
      );
    }

    const result = await updateSharedLists(
      collaborationId,
      Number(session.user.id),
      lists
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating shared lists:', error);
    return NextResponse.json(
      { error: 'Failed to update shared lists' },
      { status: 500 }
    );
  }
}
