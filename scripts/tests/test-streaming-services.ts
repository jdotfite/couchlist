/**
 * End-to-end tests for Streaming Services Preferences
 *
 * Run with: npx tsx scripts/tests/test-streaming-services.ts
 *
 * Tests:
 * - Adding streaming services
 * - Getting user's services
 * - Removing streaming services
 */

import { loadEnv, TestRunner, assertTrue, assertDefined, assertEqual } from './test-utils';

loadEnv();

import { sql } from '@vercel/postgres';

const TEST_USER_ID = 1;
const TEST_PROVIDER_ID = 8; // Netflix
const TEST_PROVIDER_ID_2 = 337; // Disney+

const runner = new TestRunner('Streaming Services');

async function cleanup() {
  // Remove test streaming service preferences (but be careful not to remove actual user preferences)
  // We'll use specific provider IDs for testing
  await sql`
    DELETE FROM user_streaming_services
    WHERE user_id = ${TEST_USER_ID}
    AND provider_id IN (${TEST_PROVIDER_ID}, ${TEST_PROVIDER_ID_2})
  `;
}

async function main() {
  console.log('Streaming Services Tests');
  console.log('========================\n');

  await cleanup();

  // Test 1: Add streaming service
  await runner.run('Add streaming service (Netflix)', async () => {
    await sql`
      INSERT INTO user_streaming_services (user_id, provider_id, provider_name)
      VALUES (${TEST_USER_ID}, ${TEST_PROVIDER_ID}, 'Netflix')
      ON CONFLICT (user_id, provider_id) DO NOTHING
    `;

    const result = await sql`
      SELECT provider_name FROM user_streaming_services
      WHERE user_id = ${TEST_USER_ID} AND provider_id = ${TEST_PROVIDER_ID}
    `;

    assertDefined(result.rows[0], 'Service should be added');
    assertEqual(result.rows[0].provider_name, 'Netflix', 'Provider name should match');
  });

  // Test 2: Add another service
  await runner.run('Add another streaming service (Disney+)', async () => {
    await sql`
      INSERT INTO user_streaming_services (user_id, provider_id, provider_name)
      VALUES (${TEST_USER_ID}, ${TEST_PROVIDER_ID_2}, 'Disney Plus')
      ON CONFLICT (user_id, provider_id) DO NOTHING
    `;

    const result = await sql`
      SELECT provider_name FROM user_streaming_services
      WHERE user_id = ${TEST_USER_ID} AND provider_id = ${TEST_PROVIDER_ID_2}
    `;

    assertDefined(result.rows[0], 'Service should be added');
  });

  // Test 3: Get all user services
  await runner.run('Get all user streaming services', async () => {
    const result = await sql`
      SELECT provider_id, provider_name
      FROM user_streaming_services
      WHERE user_id = ${TEST_USER_ID}
      ORDER BY provider_name
    `;

    assertTrue(result.rows.length >= 2, 'Should have at least 2 services');
  });

  // Test 4: Check if user has specific service
  await runner.run('Check if user has Netflix', async () => {
    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM user_streaming_services
      WHERE user_id = ${TEST_USER_ID} AND provider_id = ${TEST_PROVIDER_ID}
    `;

    assertEqual(result.rows[0].count, 1, 'User should have Netflix');
  });

  // Test 5: Remove a service
  await runner.run('Remove streaming service', async () => {
    await sql`
      DELETE FROM user_streaming_services
      WHERE user_id = ${TEST_USER_ID} AND provider_id = ${TEST_PROVIDER_ID}
    `;

    const result = await sql`
      SELECT COUNT(*)::int as count
      FROM user_streaming_services
      WHERE user_id = ${TEST_USER_ID} AND provider_id = ${TEST_PROVIDER_ID}
    `;

    assertEqual(result.rows[0].count, 0, 'Netflix should be removed');
  });

  // Cleanup
  await cleanup();

  runner.printSummary();
}

main().catch(console.error);
