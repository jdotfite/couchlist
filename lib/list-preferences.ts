import { db as sql, initDb } from './db';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

// System list types that can be renamed
export const SYSTEM_LISTS = [
  { type: 'watchlist', defaultName: 'Watchlist' },
  { type: 'watching', defaultName: 'Watching' },
  { type: 'finished', defaultName: 'Finished' },
  { type: 'onhold', defaultName: 'On Hold' },
  { type: 'dropped', defaultName: 'Dropped' },
  { type: 'favorites', defaultName: 'Favorites' },
  { type: 'rewatch', defaultName: 'Rewatch' },
  { type: 'nostalgia', defaultName: 'Classics' },
] as const;

export type SystemListType = typeof SYSTEM_LISTS[number]['type'];

export interface ListPreference {
  listType: string;
  displayName: string;
  defaultName: string;
  isHidden: boolean;
}

// Get all list preferences for a user (names only - backwards compatible)
export async function getListPreferences(userId: number): Promise<Record<string, string>> {
  await ensureDb();

  const result = await sql`
    SELECT list_type, display_name
    FROM user_list_preferences
    WHERE user_id = ${userId}
  `;

  const preferences: Record<string, string> = {};
  for (const row of result.rows) {
    if (row.display_name) {
      preferences[row.list_type] = row.display_name;
    }
  }

  return preferences;
}

// Get full list preferences including hidden state
export async function getFullListPreferences(userId: number): Promise<Record<string, { displayName: string | null; isHidden: boolean }>> {
  await ensureDb();

  const result = await sql`
    SELECT list_type, display_name, is_hidden
    FROM user_list_preferences
    WHERE user_id = ${userId}
  `;

  const preferences: Record<string, { displayName: string | null; isHidden: boolean }> = {};
  for (const row of result.rows) {
    preferences[row.list_type] = {
      displayName: row.display_name,
      isHidden: row.is_hidden || false,
    };
  }

  return preferences;
}

// Get a single list preference
export async function getListPreference(userId: number, listType: string): Promise<string | null> {
  await ensureDb();

  const result = await sql`
    SELECT display_name
    FROM user_list_preferences
    WHERE user_id = ${userId} AND list_type = ${listType}
  `;

  return result.rows[0]?.display_name || null;
}

// Set a list preference (or reset to default if displayName is null)
export async function setListPreference(
  userId: number,
  listType: string,
  displayName: string | null
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Validate list type
  const validTypes = SYSTEM_LISTS.map(l => l.type);
  if (!validTypes.includes(listType as SystemListType)) {
    return { success: false, error: 'Invalid list type' };
  }

  // Validate display name
  if (displayName !== null) {
    displayName = displayName.trim();
    if (displayName.length === 0) {
      return { success: false, error: 'Display name cannot be empty' };
    }
    if (displayName.length > 50) {
      return { success: false, error: 'Display name must be 50 characters or less' };
    }
  }

  try {
    if (displayName === null) {
      // Reset to default by deleting the preference
      await sql`
        DELETE FROM user_list_preferences
        WHERE user_id = ${userId} AND list_type = ${listType}
      `;
    } else {
      // Upsert the preference
      await sql`
        INSERT INTO user_list_preferences (user_id, list_type, display_name)
        VALUES (${userId}, ${listType}, ${displayName})
        ON CONFLICT (user_id, list_type)
        DO UPDATE SET display_name = ${displayName}, updated_at = CURRENT_TIMESTAMP
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting list preference:', error);
    return { success: false, error: 'Failed to update preference' };
  }
}

// Get the display name for a list (custom or default)
export async function getListDisplayName(userId: number, listType: string): Promise<string> {
  const customName = await getListPreference(userId, listType);
  if (customName) {
    return customName;
  }

  // Return default name
  const systemList = SYSTEM_LISTS.find(l => l.type === listType);
  return systemList?.defaultName || listType;
}

// Get all lists with their display names for a user
export async function getAllListsWithNames(userId: number): Promise<ListPreference[]> {
  const preferences = await getFullListPreferences(userId);

  return SYSTEM_LISTS.map(list => ({
    listType: list.type,
    displayName: preferences[list.type]?.displayName || list.defaultName,
    defaultName: list.defaultName,
    isHidden: preferences[list.type]?.isHidden || false,
  }));
}

// Set list hidden state
export async function setListHidden(
  userId: number,
  listType: string,
  isHidden: boolean
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Validate list type
  const validTypes = SYSTEM_LISTS.map(l => l.type);
  if (!validTypes.includes(listType as SystemListType)) {
    return { success: false, error: 'Invalid list type' };
  }

  try {
    // Check if preference exists
    const existing = await sql`
      SELECT id, display_name FROM user_list_preferences
      WHERE user_id = ${userId} AND list_type = ${listType}
    `;

    if (existing.rows.length > 0) {
      // Update existing
      await sql`
        UPDATE user_list_preferences
        SET is_hidden = ${isHidden}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId} AND list_type = ${listType}
      `;
    } else {
      // Insert new preference with just the hidden state
      await sql`
        INSERT INTO user_list_preferences (user_id, list_type, display_name, is_hidden)
        VALUES (${userId}, ${listType}, NULL, ${isHidden})
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting list hidden state:', error);
    return { success: false, error: 'Failed to update preference' };
  }
}
