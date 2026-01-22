import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { removeFromPartnerList } from '@/lib/partners';

// DELETE /api/partner-lists/[id]/items/[itemId] - Remove item from partner list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const itemIdNum = parseInt(itemId);
    const userId = parseInt(session.user.id);

    if (isNaN(itemIdNum)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const result = await removeFromPartnerList(itemIdNum, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from partner list:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
