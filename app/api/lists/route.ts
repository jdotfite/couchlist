import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import {
  getLists,
  createList,
  LIST_COLORS,
  LIST_ICONS,
  SORT_OPTIONS,
} from '@/lib/lists';

// GET /api/lists - Get all lists for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({
        lists: [],
        colors: LIST_COLORS,
        icons: LIST_ICONS,
        sortOptions: SORT_OPTIONS,
      });
    }

    const lists = await getLists(userId);

    return NextResponse.json({
      lists,
      colors: LIST_COLORS,
      icons: LIST_ICONS,
      sortOptions: SORT_OPTIONS,
    });
  } catch (error) {
    console.error('Error fetching lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}

// POST /api/lists - Create a new list
export async function POST(request: Request) {
  try {
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
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length === 0 || name.trim().length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 50 characters' },
        { status: 400 }
      );
    }

    if (description && description.length > 200) {
      return NextResponse.json(
        { error: 'Description must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (color && !LIST_COLORS.includes(color)) {
      return NextResponse.json(
        { error: 'Invalid color' },
        { status: 400 }
      );
    }

    if (icon && !LIST_ICONS.includes(icon)) {
      return NextResponse.json(
        { error: 'Invalid icon' },
        { status: 400 }
      );
    }

    if (listType && !['smart', 'manual', 'hybrid'].includes(listType)) {
      return NextResponse.json(
        { error: 'Invalid list type' },
        { status: 400 }
      );
    }

    if (sortDirection && !['asc', 'desc'].includes(sortDirection)) {
      return NextResponse.json(
        { error: 'Invalid sort direction' },
        { status: 400 }
      );
    }

    const list = await createList(userId, {
      name: name.trim(),
      description: description?.trim(),
      icon,
      color,
      listType,
      filterRules,
      sortBy,
      sortDirection,
      itemLimit,
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    console.error('Error creating list:', error);
    const message = error instanceof Error ? error.message : 'Failed to create list';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
