/**
 * End-to-end tests for Custom Lists
 *
 * Run with: npx tsx scripts/tests/test-custom-lists.ts
 *
 * Tests:
 * - Creating custom lists
 * - Adding items to lists
 * - Updating list settings
 * - Removing items from lists
 * - Deleting lists
 */

import { loadEnv, TestRunner, assertTrue, assertDefined, assertEqual } from './test-utils';

loadEnv();

import { sql } from '@vercel/postgres';

const TEST_USER_ID = 1;
const TEST_LIST_NAME = 'Test List E2E';
const TEST_SLUG = 'test-list-e2e';
const TEST_TMDB_ID = 155; // The Dark Knight
const TEST_MEDIA_TYPE = 'movie';

const runner = new TestRunner('Custom Lists');

async function cleanup() {
  // Remove test custom list and its items
  const listResult = await sql`
    SELECT id FROM custom_lists WHERE user_id = ${TEST_USER_ID} AND slug LIKE 'test-list-e2e%'
  `;

  for (const row of listResult.rows) {
    await sql`DELETE FROM custom_list_items WHERE custom_list_id = ${row.id}`;
    await sql`DELETE FROM custom_list_collaborators WHERE custom_list_id = ${row.id}`;
    await sql`DELETE FROM custom_lists WHERE id = ${row.id}`;
  }
}

async function ensureTestMedia(): Promise<number> {
  const result = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path, release_year)
    VALUES (${TEST_TMDB_ID}, ${TEST_MEDIA_TYPE}, 'The Dark Knight', '/test.jpg', 2008)
    ON CONFLICT (tmdb_id, media_type) DO UPDATE SET title = 'The Dark Knight'
    RETURNING id
  `;
  return result.rows[0].id;
}

async function main() {
  console.log('Custom Lists Tests');
  console.log('==================\n');

  await cleanup();
  const mediaId = await ensureTestMedia();
  let listId: number;

  // Test 1: Create custom list
  await runner.run('Create a custom list', async () => {
    const result = await sql`
      INSERT INTO custom_lists (user_id, slug, name, description, icon, color)
      VALUES (${TEST_USER_ID}, ${TEST_SLUG}, ${TEST_LIST_NAME}, 'Test description', 'star', 'blue')
      RETURNING id, name, slug
    `;

    assertDefined(result.rows[0], 'List should be created');
    assertEqual(result.rows[0].name, TEST_LIST_NAME, 'Name should match');
    assertEqual(result.rows[0].slug, TEST_SLUG, 'Slug should match');
    listId = result.rows[0].id;
  });

  // Test 2: Add item to list
  await runner.run('Add item to custom list', async () => {
    await sql`
      INSERT INTO custom_list_items (custom_list_id, media_id, added_by)
      VALUES (${listId}, ${mediaId}, ${TEST_USER_ID})
      ON CONFLICT (custom_list_id, media_id) DO NOTHING
    `;

    const result = await sql`
      SELECT cli.*, m.title
      FROM custom_list_items cli
      JOIN media m ON cli.media_id = m.id
      WHERE cli.custom_list_id = ${listId}
    `;

    assertTrue(result.rows.length === 1, 'Should have 1 item');
    assertEqual(result.rows[0].title, 'The Dark Knight', 'Item title should match');
  });

  // Test 3: Get list with item count
  await runner.run('Get list with item count', async () => {
    const result = await sql`
      SELECT
        cl.*,
        COUNT(cli.id)::int as item_count
      FROM custom_lists cl
      LEFT JOIN custom_list_items cli ON cl.id = cli.custom_list_id
      WHERE cl.id = ${listId}
      GROUP BY cl.id
    `;

    assertDefined(result.rows[0], 'List should exist');
    assertEqual(result.rows[0].item_count, 1, 'Item count should be 1');
  });

  // Test 4: Update list settings
  await runner.run('Update list settings', async () => {
    const newName = 'Updated Test List';
    await sql`
      UPDATE custom_lists
      SET name = ${newName}, icon = 'heart', color = 'red', updated_at = NOW()
      WHERE id = ${listId}
    `;

    const result = await sql`
      SELECT name, icon, color FROM custom_lists WHERE id = ${listId}
    `;

    assertEqual(result.rows[0].name, newName, 'Name should be updated');
    assertEqual(result.rows[0].icon, 'heart', 'Icon should be updated');
    assertEqual(result.rows[0].color, 'red', 'Color should be updated');
  });

  // Test 5: Check media is in custom list
  await runner.run('Check media exists in list', async () => {
    const result = await sql`
      SELECT cl.slug, cl.name
      FROM custom_lists cl
      JOIN custom_list_items cli ON cl.id = cli.custom_list_id
      WHERE cl.user_id = ${TEST_USER_ID} AND cli.media_id = ${mediaId}
    `;

    assertTrue(result.rows.length > 0, 'Media should be in at least one list');
  });

  // Test 6: Remove item from list
  await runner.run('Remove item from list', async () => {
    await sql`
      DELETE FROM custom_list_items
      WHERE custom_list_id = ${listId} AND media_id = ${mediaId}
    `;

    const result = await sql`
      SELECT COUNT(*)::int as count FROM custom_list_items WHERE custom_list_id = ${listId}
    `;

    assertEqual(result.rows[0].count, 0, 'List should be empty');
  });

  // Test 7: Delete list
  await runner.run('Delete custom list', async () => {
    await sql`DELETE FROM custom_lists WHERE id = ${listId}`;

    const result = await sql`
      SELECT id FROM custom_lists WHERE id = ${listId}
    `;

    assertTrue(result.rows.length === 0, 'List should be deleted');
  });

  // Cleanup
  await cleanup();

  runner.printSummary();
}

main().catch(console.error);
