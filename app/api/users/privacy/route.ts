import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPrivacySettings, updatePrivacySettings } from '@/lib/users';

// GET /api/users/privacy - Get current user's privacy settings
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const settings = await getPrivacySettings(userId);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to get privacy settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/privacy - Update privacy settings
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { discoverability, showInSearch, allowInvitesFrom } = body;

    // Validate values
    const validDiscoverability = ['everyone', 'connections_only', 'nobody'];
    const validAllowInvites = ['everyone', 'connections_only', 'nobody'];

    if (discoverability && !validDiscoverability.includes(discoverability)) {
      return NextResponse.json({ error: 'Invalid discoverability value' }, { status: 400 });
    }

    if (allowInvitesFrom && !validAllowInvites.includes(allowInvitesFrom)) {
      return NextResponse.json({ error: 'Invalid allowInvitesFrom value' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const result = await updatePrivacySettings(userId, {
      discoverability,
      showInSearch,
      allowInvitesFrom,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return updated settings
    const settings = await getPrivacySettings(userId);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}
