import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserDiscoveryRows,
  addDiscoveryRow,
  removeDiscoveryRow,
  moveDiscoveryRow,
  reorderDiscoveryRows,
  getAvailableRows,
} from '@/lib/discovery-rows';
import { DiscoveryRowType, DISCOVERY_ROW_CONFIGS, getRowsByCategory } from '@/types/discovery-rows';

// GET /api/discovery-rows - Get user's discovery rows
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await getUserDiscoveryRows(Number(session.user.id));
    const available = await getAvailableRows(Number(session.user.id));
    const availableByCategory = getRowsByCategory().map(cat => ({
      ...cat,
      rows: cat.rows.filter(r => available.includes(r.type)),
    })).filter(cat => cat.rows.length > 0);

    return NextResponse.json({
      rows,
      available,
      availableByCategory,
    });
  } catch (error) {
    console.error('Error fetching discovery rows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discovery rows' },
      { status: 500 }
    );
  }
}

// PUT /api/discovery-rows - Bulk reorder rows
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const result = await reorderDiscoveryRows(
      Number(session.user.id),
      rows.map((r: { rowType: string; position: number }) => ({
        rowType: r.rowType as DiscoveryRowType,
        position: r.position,
      }))
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering discovery rows:', error);
    return NextResponse.json(
      { error: 'Failed to reorder discovery rows' },
      { status: 500 }
    );
  }
}

// PATCH /api/discovery-rows - Single action (add, remove, move)
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, rowType, direction } = body;

    if (!rowType || !action) {
      return NextResponse.json(
        { error: 'Action and rowType are required' },
        { status: 400 }
      );
    }

    // Validate row type
    if (!(rowType in DISCOVERY_ROW_CONFIGS)) {
      return NextResponse.json(
        { error: 'Invalid row type' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'add':
        result = await addDiscoveryRow(Number(session.user.id), rowType as DiscoveryRowType);
        break;
      case 'remove':
        result = await removeDiscoveryRow(Number(session.user.id), rowType as DiscoveryRowType);
        break;
      case 'move':
        if (direction !== 'up' && direction !== 'down') {
          return NextResponse.json(
            { error: 'Invalid direction' },
            { status: 400 }
          );
        }
        result = await moveDiscoveryRow(Number(session.user.id), rowType as DiscoveryRowType, direction);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return updated rows
    const rows = await getUserDiscoveryRows(Number(session.user.id));
    const available = await getAvailableRows(Number(session.user.id));

    return NextResponse.json({ success: true, rows, available });
  } catch (error) {
    console.error('Error updating discovery row:', error);
    return NextResponse.json(
      { error: 'Failed to update discovery row' },
      { status: 500 }
    );
  }
}
