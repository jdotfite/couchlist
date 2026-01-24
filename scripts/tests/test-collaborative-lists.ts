/**
 * End-to-end tests for Collaborative Lists (Friend bidirectional sharing)
 *
 * Run with: npx tsx scripts/tests/test-collaborative-lists.ts
 *
 * Tests:
 * - Creating collaborative lists between friends
 * - Adding items to collaborative lists
 * - Both friends can see the same list
 * - Removing items from collaborative lists
 */

import { loadEnv, TestRunner, assertTrue, assertDefined, assertEqual } from './test-utils';

loadEnv();

import { sql } from '@vercel/postgres';

const TEST_USER_1 = 1; // Justin Fite
const TEST_USER_2 = 10; // Nancy Drecker
const TEST_LIST_NAME = 'E2E Test Collab List';
const TEST_TMDB_ID = 27205; // Inception
const TEST_MEDIA_TYPE = 'movie';

const runner = new TestRunner('Collaborative Lists');

async function cleanup() {
  // Remove test collaborative list
  const listResult = await sql`
    SELECT pl.id FROM partner_lists pl
    JOIN partner_list_members plm ON pl.id = plm.partner_list_id
    WHERE pl.name = ${TEST_LIST_NAME}
  `;

  for (const row of listResult.rows) {
    await sql`DELETE FROM partner_list_item_status WHERE item_id IN (SELECT id FROM partner_list_items WHERE partner_list_id = ${row.id})`;
    await sql`DELETE FROM partner_list_items WHERE partner_list_id = ${row.id}`;
    await sql`DELETE FROM partner_list_members WHERE partner_list_id = ${row.id}`;
    await sql`DELETE FROM partner_lists WHERE id = ${row.id}`;
  }
}

async function ensureFriendship(): Promise<number | null> {
  // Check if friendship exists
  const result = await sql`
    SELECT id FROM collaborators
    WHERE ((owner_id = ${TEST_USER_1} AND collaborator_id = ${TEST_USER_2})
       OR (owner_id = ${TEST_USER_2} AND collaborator_id = ${TEST_USER_1}))
    AND type = 'friend'
    AND status = 'accepted'
    LIMIT 1
  `;

  return result.rows[0]?.id || null;
}

async function ensureTestMedia(): Promise<number> {
  const result = await sql`
    INSERT INTO media (tmdb_id, media_type, title, poster_path, release_year)
    VALUES (${TEST_TMDB_ID}, ${TEST_MEDIA_TYPE}, 'Inception', '/test.jpg', 2010)
    ON CONFLICT (tmdb_id, media_type) DO UPDATE SET title = 'Inception'
    RETURNING id
  `;
  return result.rows[0].id;
}

async function main() {
  console.log('Collaborative Lists Tests');
  console.log('=========================\n');

  await cleanup();

  // Check if friendship exists
  const collaboratorId = await ensureFriendship();
  if (!collaboratorId) {
    console.log('⚠️  Skipping collaborative list tests - no friendship between test users');
    console.log('   Run test-friend-sharing.ts first or accept a friend invite between users 1 and 10');
    return;
  }

  const mediaId = await ensureTestMedia();
  let listId: number;

  // Test 1: Create collaborative list
  await runner.run('Create collaborative list', async () => {
    const result = await sql`
      INSERT INTO partner_lists (name)
      VALUES (${TEST_LIST_NAME})
      RETURNING id, name
    `;

    assertDefined(result.rows[0], 'List should be created');
    assertEqual(result.rows[0].name, TEST_LIST_NAME, 'Name should match');
    listId = result.rows[0].id;

    // Add both users as members
    await sql`
      INSERT INTO partner_list_members (partner_list_id, user_id, collaborator_id, role)
      VALUES
        (${listId}, ${TEST_USER_1}, ${collaboratorId}, 'owner'),
        (${listId}, ${TEST_USER_2}, ${collaboratorId}, 'member')
    `;
  });

  // Test 2: Verify both users can see the list
  await runner.run('Both users can see the list', async () => {
    // Check user 1
    const user1Result = await sql`
      SELECT pl.name FROM partner_lists pl
      JOIN partner_list_members plm ON pl.id = plm.partner_list_id
      WHERE plm.user_id = ${TEST_USER_1} AND pl.id = ${listId}
    `;
    assertDefined(user1Result.rows[0], 'User 1 should see the list');

    // Check user 2
    const user2Result = await sql`
      SELECT pl.name FROM partner_lists pl
      JOIN partner_list_members plm ON pl.id = plm.partner_list_id
      WHERE plm.user_id = ${TEST_USER_2} AND pl.id = ${listId}
    `;
    assertDefined(user2Result.rows[0], 'User 2 should see the list');
  });

  // Test 3: Add item to collaborative list
  await runner.run('Add item to collaborative list', async () => {
    const itemResult = await sql`
      INSERT INTO partner_list_items (partner_list_id, media_id, added_by_user_id)
      VALUES (${listId}, ${mediaId}, ${TEST_USER_1})
      RETURNING id
    `;
    const itemId = itemResult.rows[0].id;

    // Initialize status for both members
    await sql`
      INSERT INTO partner_list_item_status (item_id, user_id, watched)
      VALUES
        (${itemId}, ${TEST_USER_1}, false),
        (${itemId}, ${TEST_USER_2}, false)
    `;

    const result = await sql`
      SELECT pli.*, m.title
      FROM partner_list_items pli
      JOIN media m ON pli.media_id = m.id
      WHERE pli.partner_list_id = ${listId}
    `;

    assertTrue(result.rows.length === 1, 'Should have 1 item');
    assertEqual(result.rows[0].title, 'Inception', 'Item title should match');
    assertEqual(result.rows[0].added_by_user_id, TEST_USER_1, 'Added by should be user 1');
  });

  // Test 4: Mark item as watched by user 1
  await runner.run('Mark item as watched by user 1', async () => {
    const itemResult = await sql`
      SELECT id FROM partner_list_items WHERE partner_list_id = ${listId} LIMIT 1
    `;
    const itemId = itemResult.rows[0].id;

    await sql`
      UPDATE partner_list_item_status
      SET watched = true, watched_at = NOW()
      WHERE item_id = ${itemId} AND user_id = ${TEST_USER_1}
    `;

    const result = await sql`
      SELECT watched FROM partner_list_item_status
      WHERE item_id = ${itemId} AND user_id = ${TEST_USER_1}
    `;

    assertEqual(result.rows[0].watched, true, 'User 1 should have watched status true');

    // Verify user 2 is still unwatched
    const user2Result = await sql`
      SELECT watched FROM partner_list_item_status
      WHERE item_id = ${itemId} AND user_id = ${TEST_USER_2}
    `;

    assertEqual(user2Result.rows[0].watched, false, 'User 2 should still be unwatched');
  });

  // Test 5: Mark item as watched together
  await runner.run('Mark item as watched together', async () => {
    const itemResult = await sql`
      SELECT id FROM partner_list_items WHERE partner_list_id = ${listId} LIMIT 1
    `;
    const itemId = itemResult.rows[0].id;

    // Mark watched for both users
    await sql`
      UPDATE partner_list_item_status
      SET watched = true, watched_at = NOW()
      WHERE item_id = ${itemId}
    `;

    // Check if all members have watched
    const result = await sql`
      SELECT COUNT(*)::int as watched_count
      FROM partner_list_item_status
      WHERE item_id = ${itemId} AND watched = true
    `;

    assertEqual(result.rows[0].watched_count, 2, 'Both users should have watched');
  });

  // Test 6: Get list item count
  await runner.run('Get list with item counts', async () => {
    const result = await sql`
      SELECT
        pl.*,
        (SELECT COUNT(*)::int FROM partner_list_items WHERE partner_list_id = pl.id) as item_count
      FROM partner_lists pl
      WHERE pl.id = ${listId}
    `;

    assertEqual(result.rows[0].item_count, 1, 'Should have 1 item');
  });

  // Test 7: Remove item from list
  await runner.run('Remove item from collaborative list', async () => {
    const itemResult = await sql`
      SELECT id FROM partner_list_items WHERE partner_list_id = ${listId} LIMIT 1
    `;
    const itemId = itemResult.rows[0].id;

    // Delete statuses first
    await sql`DELETE FROM partner_list_item_status WHERE item_id = ${itemId}`;
    // Delete item
    await sql`DELETE FROM partner_list_items WHERE id = ${itemId}`;

    const result = await sql`
      SELECT COUNT(*)::int as count FROM partner_list_items WHERE partner_list_id = ${listId}
    `;

    assertEqual(result.rows[0].count, 0, 'List should be empty');
  });

  // Cleanup
  await cleanup();

  runner.printSummary();
}

main().catch(console.error);
