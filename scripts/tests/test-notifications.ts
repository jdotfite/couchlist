/**
 * End-to-end tests for Notifications
 *
 * Run with: npx tsx scripts/tests/test-notifications.ts
 *
 * Tests:
 * - Creating notifications
 * - Getting notifications
 * - Marking as read
 * - Clearing notifications
 * - Unread count
 */

import { loadEnv, TestRunner, assertTrue, assertDefined, assertEqual } from './test-utils';

loadEnv();

import { sql } from '@vercel/postgres';

const TEST_USER_ID = 1;

const runner = new TestRunner('Notifications');

async function cleanup() {
  // Remove test notifications
  await sql`
    DELETE FROM notifications
    WHERE user_id = ${TEST_USER_ID}
    AND title LIKE 'E2E Test%'
  `;
}

async function main() {
  console.log('Notifications Tests');
  console.log('===================\n');

  await cleanup();
  let notificationId: number;

  // Test 1: Create notification
  await runner.run('Create a notification', async () => {
    const result = await sql`
      INSERT INTO notifications (user_id, type, title, message, is_read)
      VALUES (${TEST_USER_ID}, 'system', 'E2E Test Notification', 'This is a test', false)
      RETURNING id, title, is_read
    `;

    assertDefined(result.rows[0], 'Notification should be created');
    assertEqual(result.rows[0].title, 'E2E Test Notification', 'Title should match');
    assertEqual(result.rows[0].is_read, false, 'Should be unread');
    notificationId = result.rows[0].id;
  });

  // Test 2: Get unread count
  await runner.run('Get unread count', async () => {
    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE user_id = ${TEST_USER_ID} AND is_read = false
    `;

    assertTrue(result.rows[0].count >= 1, 'Should have at least 1 unread notification');
  });

  // Test 3: Get notifications list
  await runner.run('Get notifications list', async () => {
    const result = await sql`
      SELECT *
      FROM notifications
      WHERE user_id = ${TEST_USER_ID}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    assertTrue(result.rows.length >= 1, 'Should have at least 1 notification');
    const testNotification = result.rows.find(n => n.id === notificationId);
    assertDefined(testNotification, 'Test notification should be in list');
  });

  // Test 4: Mark as read
  await runner.run('Mark notification as read', async () => {
    await sql`
      UPDATE notifications
      SET is_read = true
      WHERE id = ${notificationId}
    `;

    const result = await sql`
      SELECT is_read FROM notifications WHERE id = ${notificationId}
    `;

    assertEqual(result.rows[0].is_read, true, 'Should be marked as read');
  });

  // Test 5: Create multiple notifications and check count
  await runner.run('Create multiple notifications', async () => {
    await sql`
      INSERT INTO notifications (user_id, type, title, message, is_read)
      VALUES
        (${TEST_USER_ID}, 'system', 'E2E Test Notification 2', 'Test 2', false),
        (${TEST_USER_ID}, 'system', 'E2E Test Notification 3', 'Test 3', false)
    `;

    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE user_id = ${TEST_USER_ID} AND title LIKE 'E2E Test%' AND is_read = false
    `;

    assertTrue(result.rows[0].count >= 2, 'Should have at least 2 unread test notifications');
  });

  // Test 6: Mark all as read
  await runner.run('Mark all notifications as read', async () => {
    await sql`
      UPDATE notifications
      SET is_read = true
      WHERE user_id = ${TEST_USER_ID} AND title LIKE 'E2E Test%'
    `;

    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE user_id = ${TEST_USER_ID} AND title LIKE 'E2E Test%' AND is_read = false
    `;

    assertEqual(result.rows[0].count, 0, 'Should have no unread test notifications');
  });

  // Test 7: Delete notification
  await runner.run('Delete a notification', async () => {
    await sql`DELETE FROM notifications WHERE id = ${notificationId}`;

    const result = await sql`
      SELECT id FROM notifications WHERE id = ${notificationId}
    `;

    assertTrue(result.rows.length === 0, 'Notification should be deleted');
  });

  // Test 8: Clear all test notifications
  await runner.run('Clear all test notifications', async () => {
    await sql`
      DELETE FROM notifications
      WHERE user_id = ${TEST_USER_ID} AND title LIKE 'E2E Test%'
    `;

    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM notifications
      WHERE user_id = ${TEST_USER_ID} AND title LIKE 'E2E Test%'
    `;

    assertEqual(result.rows[0].count, 0, 'All test notifications should be cleared');
  });

  // Cleanup
  await cleanup();

  runner.printSummary();
}

main().catch(console.error);
