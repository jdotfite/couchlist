/**
 * Detailed diagnostic for friend sharing
 * Run with: npx tsx scripts/diagnose-sharing-detailed.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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
} catch (e) {}

import { sql } from '@vercel/postgres';

async function main() {
  console.log('=== Friend Sharing Diagnostic ===\n');

  // Get all friendships
  console.log('1. FRIENDSHIPS (collaborators where type=friend, status=accepted):');
  const friendships = await sql`
    SELECT
      c.id,
      c.owner_id,
      owner.name as owner_name,
      c.collaborator_id,
      collab.name as collab_name,
      c.accepted_at
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    JOIN users collab ON c.collaborator_id = collab.id
    WHERE c.type = 'friend' AND c.status = 'accepted'
    ORDER BY c.accepted_at DESC
    LIMIT 10
  `;
  console.table(friendships.rows);

  // Get all friend_list_access records
  console.log('\n2. FRIEND LIST ACCESS (who shares what with whom):');
  const access = await sql`
    SELECT
      fla.id,
      fla.owner_id,
      owner.name as owner_name,
      fla.friend_id,
      friend.name as friend_name,
      fla.list_type,
      fla.list_id,
      fla.can_edit,
      fla.granted_at
    FROM friend_list_access fla
    JOIN users owner ON fla.owner_id = owner.id
    JOIN users friend ON fla.friend_id = friend.id
    ORDER BY fla.granted_at DESC
    LIMIT 20
  `;
  console.table(access.rows);

  // Get all list_visibility records
  console.log('\n3. LIST VISIBILITY SETTINGS:');
  const visibility = await sql`
    SELECT
      lv.id,
      lv.user_id,
      u.name as user_name,
      lv.list_type,
      lv.list_id,
      lv.visibility,
      lv.updated_at
    FROM list_visibility lv
    JOIN users u ON lv.user_id = u.id
    WHERE lv.visibility != 'private'
    ORDER BY lv.updated_at DESC
    LIMIT 20
  `;
  console.table(visibility.rows);

  // Get collaborative lists
  console.log('\n4. COLLABORATIVE LISTS (partner_lists with 2 members):');
  const collabLists = await sql`
    SELECT
      pl.id,
      pl.name,
      pl.created_at,
      (SELECT COUNT(*)::int FROM partner_list_items WHERE partner_list_id = pl.id) as item_count,
      (SELECT string_agg(u.name, ', ') FROM partner_list_members plm JOIN users u ON u.id = plm.user_id WHERE plm.partner_list_id = pl.id) as members
    FROM partner_lists pl
    WHERE (SELECT COUNT(*) FROM partner_list_members WHERE partner_list_id = pl.id) = 2
    ORDER BY pl.created_at DESC
    LIMIT 10
  `;
  console.table(collabLists.rows);

  // Test the getListsSharedWithMe query for a specific pair
  if (friendships.rows.length > 0) {
    const friendship = friendships.rows[0];
    console.log(`\n5. TESTING getListsSharedWithMe for ${friendship.collab_name} viewing ${friendship.owner_name}'s lists:`);

    const sharedWithMe = await sql`
      SELECT DISTINCT
        lv.list_type,
        lv.list_id,
        lv.visibility,
        COALESCE(fla.can_edit, false) as can_edit,
        fla.id as fla_id
      FROM list_visibility lv
      LEFT JOIN friend_list_access fla ON
        fla.owner_id = lv.user_id
        AND fla.friend_id = ${friendship.collaborator_id}
        AND fla.list_type = lv.list_type
        AND (fla.list_id = lv.list_id OR (fla.list_id IS NULL AND lv.list_id IS NULL))
      WHERE lv.user_id = ${friendship.owner_id}
        AND (
          lv.visibility = 'friends'
          OR lv.visibility = 'public'
          OR (lv.visibility = 'select_friends' AND fla.id IS NOT NULL)
        )
      ORDER BY lv.list_type, lv.list_id
    `;
    console.table(sharedWithMe.rows);

    console.log(`\n6. TESTING getListsSharedWithFriend for ${friendship.owner_name} sharing with ${friendship.collab_name}:`);
    const sharedWithFriend = await sql`
      SELECT DISTINCT
        fla.list_type,
        fla.list_id,
        fla.can_edit
      FROM friend_list_access fla
      WHERE fla.owner_id = ${friendship.owner_id}
        AND fla.friend_id = ${friendship.collaborator_id}
    `;
    console.table(sharedWithFriend.rows);
  }

  console.log('\n=== Diagnostic Complete ===');
}

main().catch(console.error);
