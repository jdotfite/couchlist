// One-time script to delete a test user
// Run with: npx tsx --env-file=.env.local scripts/delete-user.ts

import { db, initDb } from '../lib/db';

async function deleteUser(email: string) {
  await initDb();

  console.log(`Looking up user: ${email}`);

  // Find user
  const userResult = await db`SELECT id FROM users WHERE email = ${email}`;

  if (userResult.rows.length === 0) {
    console.log('User not found');
    return;
  }

  const userId = userResult.rows[0].id;
  console.log(`Found user ID: ${userId}`);

  // Delete in order due to foreign key constraints
  console.log('Deleting user data...');

  // Delete user_media_tags for this user's media
  await db`
    DELETE FROM user_media_tags
    WHERE user_media_id IN (SELECT id FROM user_media WHERE user_id = ${userId})
  `;

  // Delete user_media
  await db`DELETE FROM user_media WHERE user_id = ${userId}`;

  // Delete shared_lists for collaborations involving this user
  await db`
    DELETE FROM shared_lists
    WHERE collaborator_id IN (
      SELECT id FROM collaborators
      WHERE owner_id = ${userId} OR collaborator_id = ${userId}
    )
  `;

  // Delete collaborators
  await db`DELETE FROM collaborators WHERE owner_id = ${userId} OR collaborator_id = ${userId}`;

  // Delete user_list_preferences
  await db`DELETE FROM user_list_preferences WHERE user_id = ${userId}`;

  // Delete user_privacy_settings
  await db`DELETE FROM user_privacy_settings WHERE user_id = ${userId}`;

  // Delete episode_progress (may not exist)
  try {
    await db`DELETE FROM episode_progress WHERE user_id = ${userId}`;
  } catch {
    // Table may not exist
  }

  // Finally delete the user
  await db`DELETE FROM users WHERE id = ${userId}`;

  console.log(`Successfully deleted user: ${email}`);
}

deleteUser('nancydrecker@gmail.com')
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
