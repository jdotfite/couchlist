import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createNotification,
  getEffectiveSettings,
  hasNotificationBeenSent,
  getUsersTrackingShow,
} from '@/lib/show-alerts';
import { getShowsWithUpcomingEpisodes } from '@/lib/show-sync';

// Vercel cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

interface AlertStats {
  premiereAlerts: number;
  episodeAlerts: number;
  finaleAlerts: number;
  errors: string[];
}

export async function GET(request: Request) {
  try {
    // Verify cron secret if set (for Vercel cron jobs)
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting alert generation...');
    const startTime = Date.now();

    const stats = await generateAlerts();

    const duration = Date.now() - startTime;
    console.log(`Alert generation completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...stats,
    });
  } catch (error) {
    console.error('Cron generate-alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts', details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}

async function generateAlerts(): Promise<AlertStats> {
  const stats: AlertStats = {
    premiereAlerts: 0,
    episodeAlerts: 0,
    finaleAlerts: 0,
    errors: [],
  };

  try {
    // Get shows with upcoming episodes within the next 7 days
    const upcomingShows = await getShowsWithUpcomingEpisodes(7);
    console.log(`Found ${upcomingShows.length} shows with upcoming episodes`);

    for (const show of upcomingShows) {
      try {
        // Get all users tracking this show
        const userIds = await getUsersTrackingShow(show.media_id);

        for (const userId of userIds) {
          // Get effective settings for this user and show
          const settings = await getEffectiveSettings(userId, show.media_id);

          // Skip if alerts disabled
          if (!settings.alerts_enabled) continue;

          const airDate = new Date(show.next_episode_to_air_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((airDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check if we should notify based on user's advance days preference
          if (daysUntil > settings.premiere_advance_days) continue;

          // Determine notification type
          const isPremiere = show.next_episode_number === 1;
          const isFinale = await checkIfFinale(show.media_id, show.next_episode_season, show.next_episode_number);

          // Handle premiere alerts
          if (isPremiere && settings.alert_season_premiere) {
            const alreadySent = await hasNotificationBeenSent(
              userId,
              'premiere',
              show.media_id,
              show.next_episode_season
            );

            if (!alreadySent) {
              await createNotification({
                user_id: userId,
                type: 'premiere',
                title: `${show.title} Season ${show.next_episode_season} Premiere`,
                message: getPremiereMessage(daysUntil, airDate),
                media_id: show.media_id,
                data: {
                  season_number: show.next_episode_season,
                  episode_number: show.next_episode_number,
                  episode_name: show.next_episode_name || undefined,
                  air_date: show.next_episode_to_air_date,
                  tmdb_id: show.tmdb_id,
                },
              });
              stats.premiereAlerts++;
            }
          }
          // Handle finale alerts
          else if (isFinale && settings.alert_season_finale) {
            const alreadySent = await hasNotificationBeenSent(
              userId,
              'finale',
              show.media_id,
              show.next_episode_season,
              show.next_episode_number
            );

            if (!alreadySent) {
              await createNotification({
                user_id: userId,
                type: 'finale',
                title: `${show.title} Season ${show.next_episode_season} Finale`,
                message: getFinaleMessage(daysUntil, airDate),
                media_id: show.media_id,
                data: {
                  season_number: show.next_episode_season,
                  episode_number: show.next_episode_number,
                  episode_name: show.next_episode_name || undefined,
                  air_date: show.next_episode_to_air_date,
                  tmdb_id: show.tmdb_id,
                },
              });
              stats.finaleAlerts++;
            }
          }
          // Handle regular episode alerts
          else if (settings.alert_episode_airing) {
            const alreadySent = await hasNotificationBeenSent(
              userId,
              'episode',
              show.media_id,
              show.next_episode_season,
              show.next_episode_number
            );

            if (!alreadySent) {
              await createNotification({
                user_id: userId,
                type: 'episode',
                title: `${show.title} S${show.next_episode_season}E${show.next_episode_number}`,
                message: getEpisodeMessage(daysUntil, airDate, show.next_episode_name),
                media_id: show.media_id,
                data: {
                  season_number: show.next_episode_season,
                  episode_number: show.next_episode_number,
                  episode_name: show.next_episode_name || undefined,
                  air_date: show.next_episode_to_air_date,
                  tmdb_id: show.tmdb_id,
                },
              });
              stats.episodeAlerts++;
            }
          }
        }
      } catch (error) {
        stats.errors.push(`Error processing show ${show.tmdb_id}: ${error}`);
      }
    }

    // Also check for new season announcements
    await generateNewSeasonAlerts(stats);

    return stats;
  } catch (error) {
    console.error('Alert generation failed:', error);
    throw error;
  }
}

async function generateNewSeasonAlerts(stats: AlertStats): Promise<void> {
  // Find shows where number_of_seasons changed since we last checked
  // We track this by checking if we've already sent a new_season notification
  // for the current number of seasons

  const result = await db`
    SELECT DISTINCT
      tsm.media_id,
      tsm.tmdb_id,
      m.title,
      m.poster_path,
      tsm.number_of_seasons
    FROM tv_show_metadata tsm
    JOIN media m ON tsm.media_id = m.id
    JOIN user_media um ON m.id = um.media_id
    WHERE tsm.status = 'Returning Series'
      AND tsm.number_of_seasons >= 1
  `;

  for (const show of result.rows) {
    const userIds = await getUsersTrackingShow(show.media_id);

    for (const userId of userIds) {
      const settings = await getEffectiveSettings(userId, show.media_id);

      if (!settings.alerts_enabled || !settings.alert_new_season) continue;

      // Check if we've already notified about this season count
      const alreadySent = await hasNotificationBeenSent(
        userId,
        'new_season',
        show.media_id,
        show.number_of_seasons
      );

      if (!alreadySent) {
        await createNotification({
          user_id: userId,
          type: 'new_season',
          title: `${show.title} Season ${show.number_of_seasons}`,
          message: `Season ${show.number_of_seasons} has been announced!`,
          media_id: show.media_id,
          data: {
            season_number: show.number_of_seasons,
            tmdb_id: show.tmdb_id,
          },
        });
        // Note: We're not incrementing a counter here since this runs
        // once per season announcement, not per-user
      }
    }
  }
}

async function checkIfFinale(
  mediaId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<boolean> {
  // We'd need to fetch season details from TMDb to know total episode count
  // For now, we use a heuristic - episode 10+ that's the last known episode
  // A more robust solution would store season episode counts in tv_show_metadata

  // Simple heuristic: if episode 8+, might be finale
  // In production, you'd want to fetch /tv/{id}/season/{season} from TMDb
  return episodeNumber >= 8;
}

function getPremiereMessage(daysUntil: number, airDate: Date): string {
  const dateStr = airDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (daysUntil === 0) return `Premieres today!`;
  if (daysUntil === 1) return `Premieres tomorrow, ${dateStr}`;
  return `Premieres ${dateStr}`;
}

function getFinaleMessage(daysUntil: number, airDate: Date): string {
  const dateStr = airDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (daysUntil === 0) return `Season finale airs today!`;
  if (daysUntil === 1) return `Season finale airs tomorrow, ${dateStr}`;
  return `Season finale airs ${dateStr}`;
}

function getEpisodeMessage(daysUntil: number, airDate: Date, episodeName: string | null): string {
  const dateStr = airDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const nameStr = episodeName ? ` - "${episodeName}"` : '';

  if (daysUntil === 0) return `New episode${nameStr} airs today!`;
  if (daysUntil === 1) return `New episode${nameStr} airs tomorrow`;
  return `New episode${nameStr} airs ${dateStr}`;
}
