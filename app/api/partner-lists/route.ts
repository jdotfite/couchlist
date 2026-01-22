import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPartnerLists, createPartnerList } from '@/lib/partners';

// GET /api/partner-lists - Get all partner lists
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const lists = await getPartnerLists(userId);

    return NextResponse.json({ lists });
  } catch (error) {
    console.error('Error getting partner lists:', error);
    return NextResponse.json({ error: 'Failed to get lists' }, { status: 500 });
  }
}

// POST /api/partner-lists - Create new partner list
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'List name too long (max 100 characters)' }, { status: 400 });
    }

    const result = await createPartnerList(userId, name.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      listId: result.listId,
    });
  } catch (error) {
    console.error('Error creating partner list:', error);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
