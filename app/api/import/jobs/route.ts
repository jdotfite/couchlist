import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { getUserImportJobs } from '@/lib/import/processor';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const jobs = await getUserImportJobs(userId);

    // Transform snake_case to camelCase for frontend
    const formattedJobs = jobs.map(job => ({
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
    }));

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error('Error fetching import jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch import jobs' },
      { status: 500 }
    );
  }
}
