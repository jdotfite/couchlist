import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCustomLists, createCustomList, AVAILABLE_ICONS, AVAILABLE_COLORS } from '@/lib/custom-lists';

// GET /api/custom-lists - Get all custom lists for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lists = await getCustomLists(Number(session.user.id));

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Error fetching custom lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom lists' },
      { status: 500 }
    );
  }
}

// POST /api/custom-lists - Create a new custom list
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon, color, is_shared } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    const result = await createCustomList(Number(session.user.id), name, {
      description,
      icon,
      color,
      is_shared,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ list: result.list }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom list:', error);
    return NextResponse.json(
      { error: 'Failed to create custom list' },
      { status: 500 }
    );
  }
}
