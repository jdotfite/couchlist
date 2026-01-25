import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCollaborativeList,
  createCollaborativeList,
  renameCollaborativeList,
  deleteCollaborativeList,
  getCollaborativeListItems
} from '@/lib/collaborative-lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/friends/[id]/collaborative-list - Get collaborative list with a friend
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const list = await getCollaborativeList(userId, friendUserId);

    if (!list) {
      return NextResponse.json({ list: null });
    }

    // Get items
    const items = await getCollaborativeListItems(userId, friendUserId);

    return NextResponse.json({
      list,
      items
    });
  } catch (error) {
    console.error('Error getting collaborative list:', error);
    return NextResponse.json(
      { error: 'Failed to get collaborative list' },
      { status: 500 }
    );
  }
}

// POST /api/friends/[id]/collaborative-list - Create collaborative list with a friend
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    console.log('[collaborative-list/POST] Creating list for userId:', userId, 'friendUserId:', friendUserId);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const name = body.name;

    const result = await createCollaborativeList(userId, friendUserId, name);

    if (!result.success) {
      console.log('[collaborative-list/POST] Failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    console.log('[collaborative-list/POST] Success, list:', result.list?.name);
    return NextResponse.json({ success: true, list: result.list });
  } catch (error) {
    console.error('Error creating collaborative list:', error);
    return NextResponse.json(
      { error: 'Failed to create collaborative list' },
      { status: 500 }
    );
  }
}

// PATCH /api/friends/[id]/collaborative-list - Rename collaborative list
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await renameCollaborativeList(userId, friendUserId, name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error renaming collaborative list:', error);
    return NextResponse.json(
      { error: 'Failed to rename collaborative list' },
      { status: 500 }
    );
  }
}

// DELETE /api/friends/[id]/collaborative-list - Delete collaborative list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const result = await deleteCollaborativeList(userId, friendUserId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collaborative list:', error);
    return NextResponse.json(
      { error: 'Failed to delete collaborative list' },
      { status: 500 }
    );
  }
}
