import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCustomList, getCustomListItems, updateCustomList, deleteCustomList } from '@/lib/custom-lists';

// GET /api/custom-lists/:slug - Get a specific custom list with its items
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = Number(session.user.id);

    const list = await getCustomList(userId, slug);
    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const items = await getCustomListItems(userId, slug);

    return NextResponse.json({ list, items });
  } catch (error) {
    console.error('Error fetching custom list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom list' },
      { status: 500 }
    );
  }
}

// PATCH /api/custom-lists/:slug - Update a custom list
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { name, description, icon, color, is_shared, cover_type, cover_media_id, show_icon, display_info } = body;

    const result = await updateCustomList(Number(session.user.id), slug, {
      name,
      description,
      icon,
      color,
      is_shared,
      cover_type,
      cover_media_id,
      show_icon,
      display_info,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ list: result.list });
  } catch (error) {
    console.error('Error updating custom list:', error);
    return NextResponse.json(
      { error: 'Failed to update custom list' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-lists/:slug - Delete a custom list
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    const result = await deleteCustomList(Number(session.user.id), slug);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom list:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom list' },
      { status: 500 }
    );
  }
}
