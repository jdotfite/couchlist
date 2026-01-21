import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getShowAlertSettings,
  setShowAlertSettings,
  deleteShowAlertSettings,
  getEffectiveSettings,
} from '@/lib/show-alerts';

interface Params {
  params: Promise<{
    mediaId: string;
  }>;
}

// GET /api/notification-settings/show/[mediaId] - Get show-specific alert settings
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaId } = await params;
    const mediaIdNum = parseInt(mediaId, 10);

    if (isNaN(mediaIdNum)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const [showSettings, effectiveSettings] = await Promise.all([
      getShowAlertSettings(Number(session.user.id), mediaIdNum),
      getEffectiveSettings(Number(session.user.id), mediaIdNum),
    ]);

    return NextResponse.json({
      showSettings,
      effectiveSettings,
    });
  } catch (error) {
    console.error('Error fetching show alert settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show alert settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/notification-settings/show/[mediaId] - Update show-specific alert settings
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaId } = await params;
    const mediaIdNum = parseInt(mediaId, 10);

    if (isNaN(mediaIdNum)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      alerts_enabled,
      alert_new_season,
      alert_season_premiere,
      alert_episode_airing,
      alert_season_finale,
      premiere_advance_days,
    } = body;

    // Validate premiere_advance_days if provided
    if (premiere_advance_days !== undefined && premiere_advance_days !== null) {
      const validDays = [0, 1, 7];
      if (!validDays.includes(premiere_advance_days)) {
        return NextResponse.json(
          { error: 'premiere_advance_days must be 0, 1, or 7' },
          { status: 400 }
        );
      }
    }

    const showSettings = await setShowAlertSettings(
      Number(session.user.id),
      mediaIdNum,
      {
        alerts_enabled,
        alert_new_season,
        alert_season_premiere,
        alert_episode_airing,
        alert_season_finale,
        premiere_advance_days,
      }
    );

    const effectiveSettings = await getEffectiveSettings(
      Number(session.user.id),
      mediaIdNum
    );

    return NextResponse.json({
      showSettings,
      effectiveSettings,
    });
  } catch (error) {
    console.error('Error updating show alert settings:', error);
    return NextResponse.json(
      { error: 'Failed to update show alert settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/notification-settings/show/[mediaId] - Remove show-specific overrides (reset to defaults)
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaId } = await params;
    const mediaIdNum = parseInt(mediaId, 10);

    if (isNaN(mediaIdNum)) {
      return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
    }

    const deleted = await deleteShowAlertSettings(
      Number(session.user.id),
      mediaIdNum
    );

    const effectiveSettings = await getEffectiveSettings(
      Number(session.user.id),
      mediaIdNum
    );

    return NextResponse.json({
      deleted,
      effectiveSettings,
    });
  } catch (error) {
    console.error('Error deleting show alert settings:', error);
    return NextResponse.json(
      { error: 'Failed to delete show alert settings' },
      { status: 500 }
    );
  }
}
