/**
 * Check default sharing preferences in the database
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
  console.log('=== Default Sharing Preferences ===\n');

  const defaults = await sql`
    SELECT
      fds.id,
      fds.user_id,
      u.name as user_name,
      fds.list_type,
      fds.list_id,
      fds.share_by_default
    FROM friend_default_sharing fds
    JOIN users u ON fds.user_id = u.id
    ORDER BY fds.user_id, fds.list_type
  `;

  if (defaults.rows.length === 0) {
    console.log('No default sharing preferences found for any users.');
    console.log('\nThis means when users accept friend invites, no lists are pre-selected.');
    console.log('Users must manually click on lists to share them.');
  } else {
    console.table(defaults.rows);
  }

  console.log('\n=== Simulation: What FriendAcceptanceSheet sees ===\n');

  // Simulate what the API returns
  const SYSTEM_LIST_TYPES = ['watchlist', 'watching', 'finished'];

  for (const userId of [1, 10]) {
    const userDefaults = await sql`
      SELECT list_type, list_id, share_by_default
      FROM friend_default_sharing
      WHERE user_id = ${userId}
    `;

    const systemListDefaults = SYSTEM_LIST_TYPES.map(listType => {
      const existing = userDefaults.rows.find(
        (d: any) => d.list_type === listType && d.list_id === null
      );
      return {
        listType,
        listId: null,
        shareByDefault: existing?.share_by_default ?? false
      };
    });

    const userName = userId === 1 ? 'Justin Fite' : 'Nancy Drecker';
    console.log(`User ${userId} (${userName}) - API response systemLists:`);
    console.table(systemListDefaults);

    const preSelected = systemListDefaults.filter(s => s.shareByDefault).map(s => s.listType);
    console.log(`Pre-selected lists: ${preSelected.length > 0 ? preSelected.join(', ') : 'none'}`);
    console.log('');
  }
}

main().catch(console.error);
