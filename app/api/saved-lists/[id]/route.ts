import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import {
  getSavedListById,
  updateSavedList,
  deleteSavedList,
  LIST_COLORS,
  LIST_ICONS,
} from '@/lib/saved-lists';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/saved-lists/[id] - Get a specific saved list
export async function GET(request: Request, { params }: RouteParams) {
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

    const list = await getSavedListById(userId, listId);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error fetching saved list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list' },
      { status: 500 }
    );
  }
}

// PATCH /api/saved-lists/[id] - Update a saved list
export async function PATCH(request: Request, { params }: RouteParams) {
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
    const {
      name,
      description,
      icon,
      color,
      listType,
      filterRules,
      sortBy,
      sortDirection,
      itemLimit,
      isPublic,
      position,
    } = body;

    // Validate inputs
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Name must be between 1 and 50 characters' },
          { status: 400 }
        );
      }
    }

    if (description !== undefined && description !== null && description.length > 200) {
      return NextResponse.json(
        { error: 'Description must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (color !== undefined && !LIST_COLORS.includes(color)) {
      return NextResponse.json(
        { error: 'Invalid color' },
        { status: 400 }
      );
    }

    if (icon !== undefined && !LIST_ICONS.includes(icon)) {
      return NextResponse.json(
        { error: 'Invalid icon' },
        { status: 400 }
      );
    }

    if (listType !== undefined && !['smart', 'manual', 'hybrid'].includes(listType)) {
      return NextResponse.json(
        { error: 'Invalid list type' },
        { status: 400 }
      );
    }

    if (sortDirection !== undefined && !['asc', 'desc'].includes(sortDirection)) {
      return NextResponse.json(
        { error: 'Invalid sort direction' },
        { status: 400 }
      );
    }

    const list = await updateSavedList(userId, listId, {
      name: name?.trim(),
      description: description !== undefined ? description?.trim() : undefined,
      icon,
      color,
      listType,
      filterRules,
      sortBy,
      sortDirection,
      itemLimit,
      isPublic,
      position,
    });

    return NextResponse.json({ list });
  } catch (error) {
    console.error('Error updating saved list:', error);
    const message = error instanceof Error ? error.message : 'Failed to update list';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

// DELETE /api/saved-lists/[id] - Delete a saved list
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

    await deleteSavedList(userId, listId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved list:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete list';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
