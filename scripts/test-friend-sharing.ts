/**
 * End-to-end test script for friend sharing functionality
 *
 * Run with: npx tsx --env-file=.env.local scripts/test-friend-sharing.ts
 *
 * This script tests the core sharing flow:
 * 1. Creates a friend connection between two users
 * 2. Sets up list sharing from one user to another
 * 3. Verifies the shared lists are retrievable
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
  console.log('Loaded environment from .env.local');
} catch (e) {
  console.log('Could not load .env.local, using existing environment');
}

import { sql } from '@vercel/postgres';

// Test user IDs - you may need to adjust these based on your actual users
// Run: SELECT id, name, email FROM users; to find valid user IDs
const USER_A_ID = 1; // The "sender" who will view shared lists
const USER_B_ID = 2; // The "acceptor" who shares their lists

async function cleanup() {
  console.log('\n--- Cleanup ---');

  // Remove test data from friend_list_access
  await sql`
    DELETE FROM friend_list_access
    WHERE (owner_id = ${USER_A_ID} AND friend_id = ${USER_B_ID})
       OR (owner_id = ${USER_B_ID} AND friend_id = ${USER_A_ID})
  `;
  console.log('Cleaned up friend_list_access');

  // Remove test data from list_visibility
  await sql`
    DELETE FROM list_visibility
    WHERE user_id IN (${USER_A_ID}, ${USER_B_ID})
      AND list_type = 'watchlist'
  `;
  console.log('Cleaned up list_visibility');
}

async function checkExistingFriendship() {
  console.log('\n--- Step 1: Check existing friendship ---');

  const result = await sql`
    SELECT id, owner_id, collaborator_id, type, status, created_at
    FROM collaborators
    WHERE (
      (owner_id = ${USER_A_ID} AND collaborator_id = ${USER_B_ID})
      OR (owner_id = ${USER_B_ID} AND collaborator_id = ${USER_A_ID})
    )
    AND type = 'friend'
  `;

  if (result.rows.length === 0) {
    console.log('No friendship found between users. Creating one...');

    // Create a friendship for testing
    const inviteCode = `test-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await sql`
      INSERT INTO collaborators (owner_id, collaborator_id, type, invite_code, invite_expires_at, status, accepted_at)
      VALUES (${USER_A_ID}, ${USER_B_ID}, 'friend', ${inviteCode}, ${expiresAt.toISOString()}, 'accepted', NOW())
    `;
    console.log('Created test friendship');
  } else {
    const friendship = result.rows[0];
    console.log('Existing friendship found:', {
      id: friendship.id,
      owner_id: friendship.owner_id,
      collaborator_id: friendship.collaborator_id,
      type: friendship.type,
      status: friendship.status
    });

    if (friendship.status !== 'accepted') {
      console.log('Friendship not accepted! Updating...');
      await sql`
        UPDATE collaborators SET status = 'accepted', accepted_at = NOW()
        WHERE id = ${friendship.id}
      `;
      console.log('Updated to accepted');
    }
  }
}

async function testAreFriends() {
  console.log('\n--- Step 2: Test areFriends check ---');

  const result = await sql`
    SELECT id, owner_id, collaborator_id, type, status FROM collaborators
    WHERE (
      (owner_id = ${USER_A_ID} AND collaborator_id = ${USER_B_ID})
      OR (owner_id = ${USER_B_ID} AND collaborator_id = ${USER_A_ID})
    )
    AND type = 'friend'
    AND status = 'accepted'
    LIMIT 1
  `;

  const areFriends = result.rows.length > 0;
  console.log(`areFriends(${USER_A_ID}, ${USER_B_ID}) = ${areFriends}`);

  if (!areFriends) {
    console.error('ERROR: Users are not friends! Cannot proceed with sharing test.');
    return false;
  }

  return true;
}

async function setupSharing() {
  console.log('\n--- Step 3: Set up sharing (User B shares watchlist with User A) ---');

  // This simulates what the sharing PATCH endpoint does
  const listType = 'watchlist';
  const ownerId = USER_B_ID;  // The user sharing their list
  const friendId = USER_A_ID; // The friend who gets access

  // Step 3a: Grant friend access
  console.log(`Granting ${friendId} access to ${ownerId}'s ${listType}...`);

  const existingAccess = await sql`
    SELECT id FROM friend_list_access
    WHERE owner_id = ${ownerId}
      AND friend_id = ${friendId}
      AND list_type = ${listType}
      AND list_id IS NULL
  `;

  if (existingAccess.rows.length > 0) {
    console.log('Access record already exists, updating...');
    await sql`
      UPDATE friend_list_access
      SET can_edit = false, granted_at = CURRENT_TIMESTAMP
      WHERE id = ${existingAccess.rows[0].id}
    `;
  } else {
    console.log('Creating new access record...');
    await sql`
      INSERT INTO friend_list_access (owner_id, friend_id, list_type, list_id, can_edit, granted_at)
      VALUES (${ownerId}, ${friendId}, ${listType}, NULL, false, CURRENT_TIMESTAMP)
    `;
  }

  // Step 3b: Set visibility to 'select_friends'
  console.log(`Setting ${listType} visibility to 'select_friends'...`);

  const existingVisibility = await sql`
    SELECT id, visibility FROM list_visibility
    WHERE user_id = ${ownerId}
      AND list_type = ${listType}
      AND list_id IS NULL
  `;

  if (existingVisibility.rows.length > 0) {
    console.log(`Current visibility: ${existingVisibility.rows[0].visibility}, updating...`);
    await sql`
      UPDATE list_visibility
      SET visibility = 'select_friends', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${existingVisibility.rows[0].id}
    `;
  } else {
    console.log('Creating new visibility record...');
    await sql`
      INSERT INTO list_visibility (user_id, list_type, list_id, visibility, updated_at)
      VALUES (${ownerId}, ${listType}, NULL, 'select_friends', CURRENT_TIMESTAMP)
    `;
  }

  console.log('Sharing setup complete!');
}

async function verifyDatabaseRecords() {
  console.log('\n--- Step 4: Verify database records ---');

  // Check friend_list_access
  const accessResult = await sql`
    SELECT * FROM friend_list_access
    WHERE owner_id = ${USER_B_ID} AND friend_id = ${USER_A_ID}
  `;
  console.log('friend_list_access records:', accessResult.rows);

  // Check list_visibility
  const visibilityResult = await sql`
    SELECT * FROM list_visibility
    WHERE user_id = ${USER_B_ID}
  `;
  console.log('list_visibility records:', visibilityResult.rows);
}

async function testGetListsSharedWithMe() {
  console.log('\n--- Step 5: Test getListsSharedWithMe query ---');

  // This is the exact query from getListsSharedWithMe
  const viewerId = USER_A_ID;
  const ownerId = USER_B_ID;

  const result = await sql`
    SELECT DISTINCT
      lv.list_type,
      lv.list_id,
      lv.visibility,
      COALESCE(fla.can_edit, false) as can_edit
    FROM list_visibility lv
    LEFT JOIN friend_list_access fla ON
      fla.owner_id = lv.user_id
      AND fla.friend_id = ${viewerId}
      AND fla.list_type = lv.list_type
      AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
    WHERE lv.user_id = ${ownerId}
      AND (
        lv.visibility = 'friends'
        OR lv.visibility = 'public'
        OR (lv.visibility = 'select_friends' AND fla.id IS NOT NULL)
      )
    ORDER BY lv.list_type, lv.list_id
  `;

  console.log(`Lists ${ownerId} shares with ${viewerId}:`, result.rows);

  if (result.rows.length === 0) {
    console.error('ERROR: No shared lists found! The query is returning empty.');
    return false;
  }

  console.log(`SUCCESS: Found ${result.rows.length} shared list(s)`);
  return true;
}

async function testSharingSummary() {
  console.log('\n--- Step 6: Simulate sharing-summary API response ---');

  const userId = USER_A_ID;  // The viewer (sender)
  const friendUserId = USER_B_ID;  // The friend (acceptor)

  // Get lists I share with this friend (should be 0 since A hasn't shared)
  const listsIShare = await sql`
    SELECT DISTINCT
      lv.list_type,
      lv.list_id,
      lv.visibility,
      COALESCE(fla.can_edit, false) as can_edit
    FROM list_visibility lv
    LEFT JOIN friend_list_access fla ON
      fla.owner_id = lv.user_id
      AND fla.friend_id = ${friendUserId}
      AND fla.list_type = lv.list_type
      AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
    WHERE lv.user_id = ${userId}
      AND (
        lv.visibility = 'friends'
        OR lv.visibility = 'public'
        OR (lv.visibility = 'select_friends' AND fla.id IS NOT NULL)
      )
  `;

  // Get lists they share with me (should show the watchlist we set up)
  const listsTheyShare = await sql`
    SELECT DISTINCT
      lv.list_type,
      lv.list_id,
      lv.visibility,
      COALESCE(fla.can_edit, false) as can_edit
    FROM list_visibility lv
    LEFT JOIN friend_list_access fla ON
      fla.owner_id = lv.user_id
      AND fla.friend_id = ${userId}
      AND fla.list_type = lv.list_type
      AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
    WHERE lv.user_id = ${friendUserId}
      AND (
        lv.visibility = 'friends'
        OR lv.visibility = 'public'
        OR (lv.visibility = 'select_friends' AND fla.id IS NOT NULL)
      )
  `;

  console.log('Sharing summary for User A viewing User B:');
  console.log(`  youShareCount: ${listsIShare.rows.length}`);
  console.log(`  theyShareCount: ${listsTheyShare.rows.length}`);
  console.log('  youShare:', listsIShare.rows);
  console.log('  theyShare:', listsTheyShare.rows);

  return listsTheyShare.rows.length > 0;
}

async function main() {
  console.log('===========================================');
  console.log('Friend Sharing End-to-End Test');
  console.log('===========================================');
  console.log(`Testing with User A (ID: ${USER_A_ID}) and User B (ID: ${USER_B_ID})`);

  try {
    // First get actual user names
    const users = await sql`SELECT id, name, email FROM users WHERE id IN (${USER_A_ID}, ${USER_B_ID})`;
    if (users.rows.length < 2) {
      console.error('\nERROR: Could not find both test users. Please update USER_A_ID and USER_B_ID.');
      console.log('Available users:');
      const allUsers = await sql`SELECT id, name, email FROM users LIMIT 10`;
      console.log(allUsers.rows);
      return;
    }
    console.log('Users:', users.rows);

    await cleanup();
    await checkExistingFriendship();

    const areFriends = await testAreFriends();
    if (!areFriends) {
      console.log('\n=== TEST FAILED: Users are not friends ===');
      return;
    }

    await setupSharing();
    await verifyDatabaseRecords();

    const sharingWorks = await testGetListsSharedWithMe();
    const summaryWorks = await testSharingSummary();

    console.log('\n===========================================');
    if (sharingWorks && summaryWorks) {
      console.log('=== ALL TESTS PASSED ===');
      console.log('The sharing database operations are working correctly.');
      console.log('If the UI is still not showing shared lists, the issue is likely:');
      console.log('1. The FriendAcceptanceSheet is not calling the sharing PATCH');
      console.log('2. The PATCH is failing due to areFriends returning false');
      console.log('3. There is a frontend caching/refresh issue');
    } else {
      console.log('=== TESTS FAILED ===');
      console.log('There is a bug in the sharing database operations.');
    }
    console.log('===========================================');

  } catch (error) {
    console.error('\nTest failed with error:', error);
  }
}

main();
