import { NextResponse } from 'next/server';
import { syncShowsForAlerts } from '@/lib/show-sync';

// Vercel cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  try {
    // Verify cron secret if set (for Vercel cron jobs)
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting TV show metadata sync...');
    const startTime = Date.now();

    const result = await syncShowsForAlerts();

    const duration = Date.now() - startTime;
    console.log(`Sync completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...result,
    });
  } catch (error) {
    console.error('Cron sync-shows error:', error);
    return NextResponse.json(
      { error: 'Failed to sync shows', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
