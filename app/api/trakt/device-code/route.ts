import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDeviceCode } from '@/lib/trakt';

// POST /api/trakt/device-code - Start device auth flow
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deviceCode = await getDeviceCode();

    return NextResponse.json(deviceCode);
  } catch (error) {
    console.error('Error getting Trakt device code:', error);
    return NextResponse.json(
      { error: 'Failed to get device code' },
      { status: 500 }
    );
  }
}
