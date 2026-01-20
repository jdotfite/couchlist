import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import {
  getImportJob,
  getImportJobItems,
  getFailedImportJobItems,
  deleteImportJob,
} from '@/lib/import/processor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const job = await getImportJob(jobId, userId);
    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    // Check if we should include items
    const { searchParams } = new URL(request.url);
    const includeItems = searchParams.get('includeItems') === 'true';
    const failedOnly = searchParams.get('failedOnly') === 'true';

    let items = null;
    if (includeItems) {
      if (failedOnly) {
        items = await getFailedImportJobItems(jobId, userId);
      } else {
        items = await getImportJobItems(jobId, userId);
      }
    }

    // Format response
    const response = {
      id: job.id,
      source: job.source,
      status: job.status,
      totalItems: job.total_items,
      processedItems: job.processed_items,
      successfulItems: job.successful_items,
      failedItems: job.failed_items,
      skippedItems: job.skipped_items,
      errorMessage: job.error_message,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      createdAt: job.created_at,
      percentage: job.total_items > 0
        ? Math.round((job.processed_items / job.total_items) * 100)
        : 0,
      items: items ? items.map(item => ({
        id: item.id,
        sourceTitle: item.source_title,
        sourceYear: item.source_year,
        sourceRating: item.source_rating,
        sourceStatus: item.source_status,
        tmdbId: item.tmdb_id,
        matchedTitle: item.matched_title,
        matchConfidence: item.match_confidence,
        status: item.status,
        resultAction: item.result_action,
        errorMessage: item.error_message,
      })) : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching import job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const deleted = await deleteImportJob(jobId, userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting import job:', error);
    return NextResponse.json(
      { error: 'Failed to delete import job' },
      { status: 500 }
    );
  }
}
