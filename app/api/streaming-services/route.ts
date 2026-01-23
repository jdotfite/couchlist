import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserStreamingServices, setUserStreamingServices } from '@/lib/streaming-services';
import { TOP_US_PROVIDERS } from '@/types/streaming';

// GET /api/streaming-services - Get user's saved streaming services
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const services = await getUserStreamingServices(Number(session.user.id));
    const providerIds = services.map(s => s.provider_id);

    return NextResponse.json({
      services,
      providerIds,
      allProviders: TOP_US_PROVIDERS,
    });
  } catch (error) {
    console.error('Error fetching streaming services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streaming services' },
      { status: 500 }
    );
  }
}

// PATCH /api/streaming-services - Update user's streaming services
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { providerIds } = body;

    if (!Array.isArray(providerIds)) {
      return NextResponse.json(
        { error: 'providerIds must be an array' },
        { status: 400 }
      );
    }

    // Validate all provider IDs are numbers
    const validIds = providerIds.filter(id => typeof id === 'number');

    const services = await setUserStreamingServices(
      Number(session.user.id),
      validIds
    );

    return NextResponse.json({
      success: true,
      services,
      providerIds: services.map(s => s.provider_id),
    });
  } catch (error) {
    console.error('Error updating streaming services:', error);
    return NextResponse.json(
      { error: 'Failed to update streaming services' },
      { status: 500 }
    );
  }
}
