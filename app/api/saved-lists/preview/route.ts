import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { previewFilter, countFilterMatches, type FilterRules } from '@/lib/list-resolver';

// POST /api/saved-lists/preview - Preview filter results without saving
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
      filterRules,
      sortBy = 'status_updated_at',
      sortDirection = 'desc',
      limit = 50,
      countOnly = false,
    } = body;

    if (!filterRules || typeof filterRules !== 'object') {
      return NextResponse.json(
        { error: 'Filter rules are required' },
        { status: 400 }
      );
    }

    // Validate sort direction
    if (!['asc', 'desc'].includes(sortDirection)) {
      return NextResponse.json(
        { error: 'Invalid sort direction' },
        { status: 400 }
      );
    }

    // If only count is needed
    if (countOnly) {
      const count = await countFilterMatches(userId, filterRules as FilterRules);
      return NextResponse.json({ count });
    }

    // Get preview items
    const items = await previewFilter(
      userId,
      filterRules as FilterRules,
      sortBy,
      sortDirection,
      Math.min(limit, 100) // Cap at 100 for preview
    );

    const totalCount = await countFilterMatches(userId, filterRules as FilterRules);

    return NextResponse.json({
      items,
      count: items.length,
      totalCount,
    });
  } catch (error) {
    console.error('Error previewing filter:', error);
    const message = error instanceof Error ? error.message : 'Failed to preview filter';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
