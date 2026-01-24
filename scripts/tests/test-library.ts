/**
 * End-to-end tests for Library Management
 *
 * Run with: npx tsx scripts/tests/test-library.ts
 *
 * Tests:
 * - Adding media to library
 * - Updating media status
 * - Rating media
 * - Removing media from library
 * - Filtering library by status
 */

import { loadEnv, TestRunner, assertTrue, assertDefined, assertArrayNotEmpty } from './test-utils';

loadEnv();

import { sql } from '@vercel/postgres';

const TEST_USER_ID = 1; // Justin Fite
const TEST_TMDB_ID = 550; // Fight Club (a well-known movie for testing)
const TEST_MEDIA_TYPE = 'movie';

const runner = new TestRunner('Library Management');

async function cleanup() {
  // Remove any test media entries
  const mediaResult = await sql`
    SELECT id FROM media WHERE tmdb_id = ${TEST_TMDB_ID} AND media_type = ${TEST_MEDIA_TYPE}
  `;

  if (mediaResult.rows.length > 0) {
    const mediaId = mediaResult.rows[0].id;
    await sql`DELETE FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}`;
  }
}

async function ensureMediaExists(): Promise<number> {
  // Insert or get the test movie
  const result = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path, release_year)
    VALUES (${TEST_TMDB_ID}, ${TEST_MEDIA_TYPE}, 'Fight Club', '/test-poster.jpg', 1999)
    ON CONFLICT (tmdb_id, media_type) DO UPDATE SET title = 'Fight Club'
    RETURNING id
  `;
  return result.rows[0].id;
}

async function main() {
  console.log('Library Management Tests');
  console.log('========================\n');

  await cleanup();
  const mediaId = await ensureMediaExists();

  // Test 1: Add media to watchlist
  await runner.run('Add media to watchlist', async () => {
    await sql`
      INSERT INTO user_media (user_id, media_id, status)
      VALUES (${TEST_USER_ID}, ${mediaId}, 'watchlist')
      ON CONFLICT (user_id, media_id) DO UPDATE SET status = 'watchlist'
    `;

    const result = await sql`
      SELECT status FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    assertDefined(result.rows[0], 'Media should be in user_media');
    assertTrue(result.rows[0].status === 'watchlist', 'Status should be watchlist');
  });

  // Test 2: Update status to watching
  await runner.run('Update status to watching', async () => {
    await sql`
      UPDATE user_media SET status = 'watching', status_updated_at = NOW()
      WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    const result = await sql`
      SELECT status FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    assertTrue(result.rows[0].status === 'watching', 'Status should be watching');
  });

  // Test 3: Update status to finished with rating
  await runner.run('Mark as finished with rating', async () => {
    await sql`
      UPDATE user_media
      SET status = 'finished', rating = 5, status_updated_at = NOW()
      WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    const result = await sql`
      SELECT status, rating FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    assertTrue(result.rows[0].status === 'finished', 'Status should be finished');
    assertTrue(result.rows[0].rating === 5, 'Rating should be 5');
  });

  // Test 4: Filter library by status
  await runner.run('Filter library by status', async () => {
    const result = await sql`
      SELECT um.*, m.title, m.tmdb_id
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      WHERE um.user_id = ${TEST_USER_ID} AND um.status = 'finished'
    `;

    assertArrayNotEmpty(result.rows, 'Should have at least one finished item');

    const testMovie = result.rows.find(r => r.tmdb_id === TEST_TMDB_ID);
    assertDefined(testMovie, 'Test movie should be in finished list');
  });

  // Test 5: Get library counts
  await runner.run('Get library counts by status', async () => {
    const result = await sql`
      SELECT status, COUNT(*)::int as count
      FROM user_media
      WHERE user_id = ${TEST_USER_ID}
      GROUP BY status
    `;

    assertTrue(result.rows.length > 0, 'Should have counts for at least one status');

    const finishedCount = result.rows.find(r => r.status === 'finished');
    assertDefined(finishedCount, 'Should have finished count');
    assertTrue(finishedCount.count >= 1, 'Should have at least 1 finished item');
  });

  // Test 6: Remove from library
  await runner.run('Remove media from library', async () => {
    await sql`
      DELETE FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    const result = await sql`
      SELECT id FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    assertTrue(result.rows.length === 0, 'Media should be removed from library');
  });

  // Print summary
  runner.printSummary();
}

main().catch(console.error);
