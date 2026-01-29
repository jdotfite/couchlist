// Cleanup script to remove shared lists tables
// Run with: node --env-file=.env.local scripts/cleanup-shared-lists.js

const { sql } = require('@vercel/postgres');

async function cleanup() {
  console.log('Starting shared lists cleanup...\n');

  // Tables to drop (in order to respect foreign keys)
  const drops = [
    'DROP TABLE IF EXISTS shared_lists CASCADE',
    'DROP TABLE IF EXISTS friend_list_access CASCADE',
    'DROP TABLE IF EXISTS friend_default_sharing CASCADE',
    'DROP TABLE IF EXISTS list_visibility CASCADE'
  ];

  for (const query of drops) {
    const tableName = query.match(/DROP TABLE IF EXISTS (\w+)/)[1];
    try {
      await sql.query(query);
      console.log(`✓ Dropped: ${tableName}`);
    } catch (e) {
      console.log(`✗ Error dropping ${tableName}:`, e.message);
    }
  }

  console.log('\n✓ Cleanup complete!');
  process.exit(0);
}

cleanup().catch(e => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
