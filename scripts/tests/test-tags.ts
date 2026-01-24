/**
 * End-to-end tests for Tags (Favorites, Rewatch, Classics)
 *
 * Run with: npx tsx scripts/tests/test-tags.ts
 *
 * Tests:
 * - Adding tags to media
 * - Removing tags from media
 * - Filtering by tags
 * - Multiple tags on same media
 */

import { loadEnv, TestRunner, assertTrue, assertDefined, assertArrayNotEmpty } from './test-utils';

loadEnv();

import { sql } from '@vercel/postgres';

const TEST_USER_ID = 1;
const TEST_TMDB_ID = 680; // Pulp Fiction
const TEST_MEDIA_TYPE = 'movie';

const runner = new TestRunner('Tags Management');

async function cleanup() {
  const mediaResult = await sql`
    SELECT id FROM media WHERE tmdb_id = ${TEST_TMDB_ID} AND media_type = ${TEST_MEDIA_TYPE}
  `;

  if (mediaResult.rows.length > 0) {
    const mediaId = mediaResult.rows[0].id;

    // Get user_media id
    const umResult = await sql`
      SELECT id FROM user_media WHERE user_id = ${TEST_USER_ID} AND media_id = ${mediaId}
    `;

    if (umResult.rows.length > 0) {
      // Remove tags
      await sql`DELETE FROM user_media_tags WHERE user_media_id = ${umResult.rows[0].id}`;
      // Remove user_media entry
      await sql`DELETE FROM user_media WHERE id = ${umResult.rows[0].id}`;
    }
  }
}

async function setupTestMedia(): Promise<{ mediaId: number; userMediaId: number }> {
  // Ensure media exists
  const mediaResult = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path, release_year)
    VALUES (${TEST_TMDB_ID}, ${TEST_MEDIA_TYPE}, 'Pulp Fiction', '/test.jpg', 1994)
    ON CONFLICT (tmdb_id, media_type) DO UPDATE SET title = 'Pulp Fiction'
    RETURNING id
  `;
  const mediaId = mediaResult.rows[0].id;

  // Add to user's library
  const umResult = await sql`
    INSERT INTO user_media (user_id, media_id, status)
    VALUES (${TEST_USER_ID}, ${mediaId}, 'finished')
    ON CONFLICT (user_id, media_id) DO UPDATE SET status = 'finished'
    RETURNING id
  `;

  return { mediaId, userMediaId: umResult.rows[0].id };
}

async function getTagId(slug: string): Promise<number> {
  const result = await sql`
    SELECT id FROM tags WHERE slug = ${slug} AND user_id IS NULL
  `;
  assertDefined(result.rows[0], `System tag '${slug}' should exist`);
  return result.rows[0].id;
}

async function main() {
  console.log('Tags Management Tests');
  console.log('=====================\n');

  await cleanup();
  const { userMediaId } = await setupTestMedia();

  // Test 1: System tags exist
  await runner.run('System tags exist (favorites, rewatch, nostalgia)', async () => {
    const result = await sql`
      SELECT slug FROM tags WHERE user_id IS NULL ORDER BY slug
    `;

    const slugs = result.rows.map(r => r.slug);
    assertTrue(slugs.includes('favorites'), 'favorites tag should exist');
    assertTrue(slugs.includes('rewatch'), 'rewatch tag should exist');
    assertTrue(slugs.includes('nostalgia'), 'nostalgia (classics) tag should exist');
  });

  // Test 2: Add favorites tag
  await runner.run('Add favorites tag to media', async () => {
    const tagId = await getTagId('favorites');

    await sql`
      INSERT INTO user_media_tags (user_media_id, tag_id)
      VALUES (${userMediaId}, ${tagId})
      ON CONFLICT (user_media_id, tag_id) DO NOTHING
    `;

    const result = await sql`
      SELECT t.slug FROM user_media_tags umt
      JOIN tags t ON umt.tag_id = t.id
      WHERE umt.user_media_id = ${userMediaId}
    `;

    assertTrue(result.rows.some(r => r.slug === 'favorites'), 'Media should have favorites tag');
  });

  // Test 3: Add multiple tags
  await runner.run('Add rewatch tag (multiple tags on same media)', async () => {
    const tagId = await getTagId('rewatch');

    await sql`
      INSERT INTO user_media_tags (user_media_id, tag_id)
      VALUES (${userMediaId}, ${tagId})
      ON CONFLICT (user_media_id, tag_id) DO NOTHING
    `;

    const result = await sql`
      SELECT t.slug FROM user_media_tags umt
      JOIN tags t ON umt.tag_id = t.id
      WHERE umt.user_media_id = ${userMediaId}
    `;

    assertTrue(result.rows.length >= 2, 'Media should have at least 2 tags');
    assertTrue(result.rows.some(r => r.slug === 'favorites'), 'Should have favorites');
    assertTrue(result.rows.some(r => r.slug === 'rewatch'), 'Should have rewatch');
  });

  // Test 4: Filter by tag
  await runner.run('Filter library by favorites tag', async () => {
    const result = await sql`
      SELECT m.title, m.tmdb_id
      FROM user_media um
      JOIN media m ON um.media_id = m.id
      JOIN user_media_tags umt ON umt.user_media_id = um.id
      JOIN tags t ON umt.tag_id = t.id
      WHERE um.user_id = ${TEST_USER_ID} AND t.slug = 'favorites'
    `;

    assertArrayNotEmpty(result.rows, 'Should have favorites');
    assertTrue(result.rows.some(r => r.tmdb_id === TEST_TMDB_ID), 'Test movie should be in favorites');
  });

  // Test 5: Count items by tag
  await runner.run('Count items by tag', async () => {
    const result = await sql`
      SELECT t.slug, COUNT(*)::int as count
      FROM user_media_tags umt
      JOIN tags t ON umt.tag_id = t.id
      JOIN user_media um ON umt.user_media_id = um.id
      WHERE um.user_id = ${TEST_USER_ID}
      GROUP BY t.slug
    `;

    const favoritesCount = result.rows.find(r => r.slug === 'favorites');
    assertDefined(favoritesCount, 'Should have favorites count');
    assertTrue(favoritesCount.count >= 1, 'Should have at least 1 favorite');
  });

  // Test 6: Remove tag
  await runner.run('Remove rewatch tag', async () => {
    const tagId = await getTagId('rewatch');

    await sql`
      DELETE FROM user_media_tags
      WHERE user_media_id = ${userMediaId} AND tag_id = ${tagId}
    `;

    const result = await sql`
      SELECT t.slug FROM user_media_tags umt
      JOIN tags t ON umt.tag_id = t.id
      WHERE umt.user_media_id = ${userMediaId}
    `;

    assertTrue(!result.rows.some(r => r.slug === 'rewatch'), 'Rewatch tag should be removed');
    assertTrue(result.rows.some(r => r.slug === 'favorites'), 'Favorites should still exist');
  });

  // Cleanup
  await cleanup();

  runner.printSummary();
}

main().catch(console.error);
