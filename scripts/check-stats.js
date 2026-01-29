require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function getStats(userId, name) {
  // Replicate the getStatsOverview function
  const countsResult = await sql`
    SELECT
      m.media_type,
      um.status,
      COUNT(*)::int as count,
      SUM(COALESCE(m.runtime, 0))::int as total_runtime
    FROM user_media um
    JOIN media m ON m.id = um.media_id
    WHERE um.user_id = ${userId}
      AND um.status IS NOT NULL
    GROUP BY m.media_type, um.status
  `;

  const episodesResult = await sql`
    SELECT COUNT(*)::int as count FROM user_episodes WHERE user_id = ${userId}
  `;

  let totalWatchTimeMinutes = 0;

  console.log(`\n=== ${name} (ID: ${userId}) ===`);

  for (const row of countsResult.rows) {
    if (row.media_type === 'movie' && row.status === 'finished') {
      console.log('Finished movies runtime:', row.total_runtime, 'min (' + row.count + ' movies)');
      totalWatchTimeMinutes += row.total_runtime || 0;
    }
  }

  const episodes = episodesResult.rows[0]?.count || 0;
  const episodeTime = episodes * 45;
  console.log('Episodes:', episodes, '× 45 min =', episodeTime, 'min');
  totalWatchTimeMinutes += episodeTime;

  console.log('Total watch time:', totalWatchTimeMinutes, 'min');
  console.log('= Hours:', Math.floor(totalWatchTimeMinutes / 60));
  console.log('= Days:', (totalWatchTimeMinutes / (60 * 24)).toFixed(1));

  // Format like the app does
  const days = Math.floor(totalWatchTimeMinutes / (60 * 24));
  const hours = Math.floor((totalWatchTimeMinutes % (60 * 24)) / 60);
  const display = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  console.log('Display:', display);
}

async function main() {
  await getStats(1, 'Justin');
  await getStats(2, 'Dane');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
