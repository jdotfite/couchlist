import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getGlobalNotificationSettings,
  setGlobalNotificationSettings,
} from '@/lib/show-alerts';

// GET /api/notification-settings - Get global notification settings
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getGlobalNotificationSettings(Number(session.user.id));

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/notification-settings - Update global notification settings
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      alert_new_season,
      alert_season_premiere,
      alert_episode_airing,
      alert_season_finale,
      alert_show_ended,
      premiere_advance_days,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
    } = body;

    // Validate premiere_advance_days if provided
    if (premiere_advance_days !== undefined) {
      const validDays = [0, 1, 7];
      if (!validDays.includes(premiere_advance_days)) {
        return NextResponse.json(
          { error: 'premiere_advance_days must be 0, 1, or 7' },
          { status: 400 }
        );
      }
    }

    const settings = await setGlobalNotificationSettings(Number(session.user.id), {
      alert_new_season,
      alert_season_premiere,
      alert_episode_airing,
      alert_season_finale,
      alert_show_ended,
      premiere_advance_days,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
