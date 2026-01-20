import { db as sql, initDb } from './db';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

// Username validation
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'system', 'api', 'www',
  'mail', 'email', 'support', 'help', 'info', 'contact',
  'about', 'settings', 'profile', 'account', 'login', 'logout',
  'register', 'signup', 'signin', 'auth', 'oauth', 'callback',
  'movies', 'shows', 'tv', 'lists', 'discover', 'search',
  'invite', 'notifications', 'privacy', 'terms', 'delete',
];

export interface UserPrivacySettings {
  discoverability: 'everyone' | 'connections_only' | 'nobody';
  showInSearch: boolean;
  allowInvitesFrom: 'everyone' | 'connections_only' | 'nobody';
}

export interface UserSearchResult {
  id: number;
  name: string;
  username: string | null;
  isConnection: boolean;
}

// Validate username format
export function isValidUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
}

// Check if username is available
export async function isUsernameAvailable(username: string, excludeUserId?: number): Promise<boolean> {
  await ensureDb();

  if (excludeUserId) {
    const result = await sql`
      SELECT id FROM users
      WHERE LOWER(username) = LOWER(${username})
      AND id != ${excludeUserId}
    `;
    return result.rows.length === 0;
  } else {
    const result = await sql`
      SELECT id FROM users
      WHERE LOWER(username) = LOWER(${username})
    `;
    return result.rows.length === 0;
  }
}

// Set username for a user
export async function setUsername(
  userId: number,
  username: string
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  const validation = isValidUsername(username);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const available = await isUsernameAvailable(username, userId);
  if (!available) {
    return { success: false, error: 'This username is already taken' };
  }

  try {
    await sql`
      UPDATE users SET username = ${username.toLowerCase()} WHERE id = ${userId}
    `;
    return { success: true };
  } catch (error) {
    console.error('Error setting username:', error);
    return { success: false, error: 'Failed to set username' };
  }
}

// Get user's username
export async function getUsername(userId: number): Promise<string | null> {
  await ensureDb();

  const result = await sql`
    SELECT username FROM users WHERE id = ${userId}
  `;

  return result.rows[0]?.username || null;
}

// Get user's privacy settings
export async function getPrivacySettings(userId: number): Promise<UserPrivacySettings> {
  await ensureDb();

  const result = await sql`
    SELECT discoverability, show_in_search, allow_invites_from
    FROM user_privacy_settings
    WHERE user_id = ${userId}
  `;

  if (result.rows[0]) {
    return {
      discoverability: result.rows[0].discoverability,
      showInSearch: result.rows[0].show_in_search,
      allowInvitesFrom: result.rows[0].allow_invites_from,
    };
  }

  // Return defaults if no settings exist
  return {
    discoverability: 'everyone',
    showInSearch: true,
    allowInvitesFrom: 'everyone',
  };
}

// Update user's privacy settings
export async function updatePrivacySettings(
  userId: number,
  settings: Partial<UserPrivacySettings>
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    await sql`
      INSERT INTO user_privacy_settings (user_id, discoverability, show_in_search, allow_invites_from)
      VALUES (
        ${userId},
        ${settings.discoverability || 'everyone'},
        ${settings.showInSearch !== undefined ? settings.showInSearch : true},
        ${settings.allowInvitesFrom || 'everyone'}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        discoverability = COALESCE(${settings.discoverability}, user_privacy_settings.discoverability),
        show_in_search = COALESCE(${settings.showInSearch}, user_privacy_settings.show_in_search),
        allow_invites_from = COALESCE(${settings.allowInvitesFrom}, user_privacy_settings.allow_invites_from),
        updated_at = CURRENT_TIMESTAMP
    `;
    return { success: true };
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return { success: false, error: 'Failed to update privacy settings' };
  }
}

// Check if two users are connected (have collaborated before)
export async function areUsersConnected(userId1: number, userId2: number): Promise<boolean> {
  await ensureDb();

  // Check system list collaborations
  const systemCollab = await sql`
    SELECT id FROM collaborators
    WHERE ((owner_id = ${userId1} AND collaborator_id = ${userId2})
       OR (owner_id = ${userId2} AND collaborator_id = ${userId1}))
    AND status = 'accepted'
  `;

  if (systemCollab.rows.length > 0) return true;

  // Check custom list collaborations
  const customCollab = await sql`
    SELECT clc1.id
    FROM custom_list_collaborators clc1
    JOIN custom_list_collaborators clc2 ON clc1.custom_list_id = clc2.custom_list_id
    WHERE clc1.user_id = ${userId1}
      AND clc2.user_id = ${userId2}
      AND clc1.status = 'accepted'
      AND clc2.status = 'accepted'
  `;

  return customCollab.rows.length > 0;
}

// Search for users by username or email
export async function searchUsers(
  searcherId: number,
  query: string,
  limit: number = 10
): Promise<UserSearchResult[]> {
  await ensureDb();

  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim().toLowerCase();
  const isEmailSearch = trimmedQuery.includes('@');

  let results;

  if (isEmailSearch) {
    // Email search - exact match only, respects privacy
    results = await sql`
      SELECT u.id, u.name, u.username
      FROM users u
      LEFT JOIN user_privacy_settings ups ON u.id = ups.user_id
      WHERE u.id != ${searcherId}
        AND LOWER(u.email) = ${trimmedQuery}
        AND (ups.show_in_search IS NULL OR ups.show_in_search = true)
      LIMIT ${limit}
    `;
  } else {
    // Username/name search - partial match, respects privacy
    results = await sql`
      SELECT u.id, u.name, u.username
      FROM users u
      LEFT JOIN user_privacy_settings ups ON u.id = ups.user_id
      WHERE u.id != ${searcherId}
        AND (ups.show_in_search IS NULL OR ups.show_in_search = true)
        AND (
          LOWER(u.username) LIKE ${trimmedQuery + '%'}
          OR LOWER(u.name) LIKE ${'%' + trimmedQuery + '%'}
        )
      ORDER BY
        CASE WHEN LOWER(u.username) = ${trimmedQuery} THEN 0
             WHEN LOWER(u.username) LIKE ${trimmedQuery + '%'} THEN 1
             ELSE 2 END,
        u.name ASC
      LIMIT ${limit}
    `;
  }

  // Check connection status for each result
  const resultsWithConnection: UserSearchResult[] = [];
  for (const row of results.rows) {
    const isConnection = await areUsersConnected(searcherId, row.id);
    resultsWithConnection.push({
      id: row.id,
      name: row.name,
      username: row.username,
      isConnection,
    });
  }

  return resultsWithConnection;
}

// Check if user can be invited by another user
export async function canUserBeInvitedBy(
  targetUserId: number,
  inviterId: number
): Promise<{ canInvite: boolean; reason?: string }> {
  await ensureDb();

  const settings = await getPrivacySettings(targetUserId);

  if (settings.allowInvitesFrom === 'nobody') {
    return { canInvite: false, reason: 'User has disabled invitations' };
  }

  if (settings.allowInvitesFrom === 'connections_only') {
    const connected = await areUsersConnected(targetUserId, inviterId);
    if (!connected) {
      return { canInvite: false, reason: 'User only accepts invites from connections' };
    }
  }

  return { canInvite: true };
}

// Get user by ID (basic info only)
export async function getUserById(userId: number): Promise<{ id: number; name: string; username: string | null } | null> {
  await ensureDb();

  const result = await sql`
    SELECT id, name, username FROM users WHERE id = ${userId}
  `;

  return result.rows[0] || null;
}

// Get user profile with username
export async function getUserProfile(userId: number): Promise<{
  id: number;
  name: string;
  email: string;
  username: string | null;
  privacySettings: UserPrivacySettings;
} | null> {
  await ensureDb();

  const result = await sql`
    SELECT id, name, email, username FROM users WHERE id = ${userId}
  `;

  if (!result.rows[0]) return null;

  const privacySettings = await getPrivacySettings(userId);

  return {
    ...result.rows[0],
    privacySettings,
  };
}
