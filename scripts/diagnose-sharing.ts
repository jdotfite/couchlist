/**
 * Diagnostic script to check the current state of friendships and sharing
 *
 * Run with: npx tsx scripts/diagnose-sharing.ts
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
} catch (e) {
  console.log('Could not load .env.local');
}

import { sql } from '@vercel/postgres';

async function main() {
  console.log('===========================================');
  console.log('Friendship & Sharing Diagnostic Report');
  console.log('===========================================\n');

  // 1. Show all users
  console.log('--- All Users ---');
  const users = await sql`SELECT id, name, email, username FROM users ORDER BY id`;
  console.table(users.rows);

  // 2. Show all friend relationships
  console.log('\n--- All Friend Relationships (collaborators where type=friend) ---');
  const friendships = await sql`
    SELECT
      c.id,
      c.owner_id,
      owner.name as owner_name,
      c.collaborator_id,
      collab.name as collaborator_name,
      c.type,
      c.status,
      c.created_at,
      c.accepted_at
    FROM collaborators c
    LEFT JOIN users owner ON c.owner_id = owner.id
    LEFT JOIN users collab ON c.collaborator_id = collab.id
    WHERE c.type = 'friend'
    ORDER BY c.created_at DESC
    LIMIT 20
  `;
  console.table(friendships.rows);

  // 3. Show all list_visibility records
  console.log('\n--- All List Visibility Records ---');
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
    ORDER BY lv.updated_at DESC
    LIMIT 20
  `;
  console.table(visibility.rows);

  // 4. Show all friend_list_access records
  console.log('\n--- All Friend List Access Records ---');
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

  // 5. Show collaborative lists
  console.log('\n--- Collaborative Lists (partner_lists with 2 members) ---');
  const collabLists = await sql`
    SELECT
      pl.id,
      pl.name,
      pl.created_at,
      (SELECT COUNT(*) FROM partner_list_items WHERE partner_list_id = pl.id) as item_count,
      (
        SELECT STRING_AGG(u.name, ', ')
        FROM partner_list_members plm
        JOIN users u ON plm.user_id = u.id
        WHERE plm.partner_list_id = pl.id
      ) as members
    FROM partner_lists pl
    WHERE (SELECT COUNT(*) FROM partner_list_members WHERE partner_list_id = pl.id) = 2
    ORDER BY pl.created_at DESC
    LIMIT 10
  `;
  console.table(collabLists.rows);

  // 6. For each accepted friendship, show what's shared
  console.log('\n--- Sharing Summary Per Friendship ---');
  const acceptedFriendships = await sql`
    SELECT
      c.id,
      c.owner_id,
      owner.name as owner_name,
      c.collaborator_id,
      collab.name as collaborator_name
    FROM collaborators c
    JOIN users owner ON c.owner_id = owner.id
    JOIN users collab ON c.collaborator_id = collab.id
    WHERE c.type = 'friend' AND c.status = 'accepted'
    ORDER BY c.accepted_at DESC
    LIMIT 10
  `;

  for (const f of acceptedFriendships.rows) {
    console.log(`\n${f.owner_name} (${f.owner_id}) <-> ${f.collaborator_name} (${f.collaborator_id}):`);

    // What does owner share with collaborator?
    const ownerShares = await sql`
      SELECT fla.list_type, lv.visibility
      FROM friend_list_access fla
      LEFT JOIN list_visibility lv ON
        lv.user_id = fla.owner_id
        AND lv.list_type = fla.list_type
        AND (lv.list_id = fla.list_id OR (lv.list_id IS NULL AND fla.list_id IS NULL))
      WHERE fla.owner_id = ${f.owner_id} AND fla.friend_id = ${f.collaborator_id}
    `;
    console.log(`  ${f.owner_name} shares with ${f.collaborator_name}: ${ownerShares.rows.length > 0 ? ownerShares.rows.map(r => r.list_type).join(', ') : 'nothing'}`);

    // What does collaborator share with owner?
    const collabShares = await sql`
      SELECT fla.list_type, lv.visibility
      FROM friend_list_access fla
      LEFT JOIN list_visibility lv ON
        lv.user_id = fla.owner_id
        AND lv.list_type = fla.list_type
        AND (lv.list_id = fla.list_id OR (lv.list_id IS NULL AND fla.list_id IS NULL))
      WHERE fla.owner_id = ${f.collaborator_id} AND fla.friend_id = ${f.owner_id}
    `;
    console.log(`  ${f.collaborator_name} shares with ${f.owner_name}: ${collabShares.rows.length > 0 ? collabShares.rows.map(r => r.list_type).join(', ') : 'nothing'}`);

    // Check for collaborative list
    const collabList = await sql`
      SELECT pl.name
      FROM partner_lists pl
      WHERE EXISTS (
        SELECT 1 FROM partner_list_members WHERE partner_list_id = pl.id AND user_id = ${f.owner_id}
      )
      AND EXISTS (
        SELECT 1 FROM partner_list_members WHERE partner_list_id = pl.id AND user_id = ${f.collaborator_id}
      )
      AND (SELECT COUNT(*) FROM partner_list_members WHERE partner_list_id = pl.id) = 2
    `;
    console.log(`  Collaborative list: ${collabList.rows.length > 0 ? collabList.rows[0].name : 'none'}`);
  }

  console.log('\n===========================================');
  console.log('End of diagnostic report');
  console.log('===========================================');
}

main().catch(console.error);
