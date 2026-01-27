import { db as sql, initDb } from './db';
import {
  DiscoveryRowType,
  UserDiscoveryRow,
  UserDiscoveryRowWithConfig,
  DISCOVERY_ROW_CONFIGS,
  DEFAULT_DISCOVERY_ROWS,
  ALL_DISCOVERY_ROW_TYPES,
} from '@/types/discovery-rows';

// Ensure tables exist
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

// Get all discovery rows for a user
export async function getUserDiscoveryRows(userId: number): Promise<UserDiscoveryRowWithConfig[]> {
  await ensureDb();

  const result = await sql`
    SELECT id, row_type, position, is_visible
    FROM user_discovery_rows
    WHERE user_id = ${userId} AND is_visible = true
    ORDER BY position ASC
  `;

  // If no rows exist, initialize defaults
  if (result.rows.length === 0) {
    await initializeDefaultRows(userId);
    return getUserDiscoveryRows(userId);
  }

  return result.rows
    .filter(row => row.row_type in DISCOVERY_ROW_CONFIGS)
    .map(row => ({
      id: row.id,
      rowType: row.row_type as DiscoveryRowType,
      position: row.position,
      isVisible: row.is_visible,
      config: DISCOVERY_ROW_CONFIGS[row.row_type as DiscoveryRowType],
    }));
}

// Get all discovery rows (including hidden) for settings page
export async function getAllUserDiscoveryRows(userId: number): Promise<UserDiscoveryRowWithConfig[]> {
  await ensureDb();

  const result = await sql`
    SELECT id, row_type, position, is_visible
    FROM user_discovery_rows
    WHERE user_id = ${userId}
    ORDER BY position ASC
  `;

  // If no rows exist, initialize defaults
  if (result.rows.length === 0) {
    await initializeDefaultRows(userId);
    return getAllUserDiscoveryRows(userId);
  }

  return result.rows
    .filter(row => row.row_type in DISCOVERY_ROW_CONFIGS)
    .map(row => ({
      id: row.id,
      rowType: row.row_type as DiscoveryRowType,
      position: row.position,
      isVisible: row.is_visible,
      config: DISCOVERY_ROW_CONFIGS[row.row_type as DiscoveryRowType],
    }));
}

// Initialize default rows for a new user
export async function initializeDefaultRows(userId: number): Promise<void> {
  await ensureDb();

  // Check if user already has rows
  const existing = await sql`
    SELECT COUNT(*) as count FROM user_discovery_rows WHERE user_id = ${userId}
  `;

  if (existing.rows[0].count > 0) {
    return;
  }

  // Insert default rows
  for (let i = 0; i < DEFAULT_DISCOVERY_ROWS.length; i++) {
    const rowType = DEFAULT_DISCOVERY_ROWS[i];
    await sql`
      INSERT INTO user_discovery_rows (user_id, row_type, position, is_visible)
      VALUES (${userId}, ${rowType}, ${i}, true)
      ON CONFLICT (user_id, row_type) DO NOTHING
    `;
  }
}

// Add a discovery row
export async function addDiscoveryRow(
  userId: number,
  rowType: DiscoveryRowType
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  // Validate row type
  if (!ALL_DISCOVERY_ROW_TYPES.includes(rowType)) {
    return { success: false, error: 'Invalid row type' };
  }

  try {
    // Get the current max position
    const maxResult = await sql`
      SELECT COALESCE(MAX(position), -1) as max_position
      FROM user_discovery_rows
      WHERE user_id = ${userId}
    `;
    const nextPosition = maxResult.rows[0].max_position + 1;

    // Check if row already exists (might be hidden)
    const existing = await sql`
      SELECT id, is_visible FROM user_discovery_rows
      WHERE user_id = ${userId} AND row_type = ${rowType}
    `;

    if (existing.rows.length > 0) {
      if (existing.rows[0].is_visible) {
        return { success: false, error: 'Row already exists' };
      }
      // Re-enable hidden row and move to end
      await sql`
        UPDATE user_discovery_rows
        SET is_visible = true, position = ${nextPosition}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId} AND row_type = ${rowType}
      `;
    } else {
      // Insert new row
      await sql`
        INSERT INTO user_discovery_rows (user_id, row_type, position, is_visible)
        VALUES (${userId}, ${rowType}, ${nextPosition}, true)
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding discovery row:', error);
    return { success: false, error: 'Failed to add row' };
  }
}

// Remove (hide) a discovery row
export async function removeDiscoveryRow(
  userId: number,
  rowType: DiscoveryRowType
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    const result = await sql`
      UPDATE user_discovery_rows
      SET is_visible = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND row_type = ${rowType}
    `;

    if (result.rowCount === 0) {
      return { success: false, error: 'Row not found' };
    }

    // Reorder remaining rows to close gaps
    await reorderAfterRemoval(userId);

    return { success: true };
  } catch (error) {
    console.error('Error removing discovery row:', error);
    return { success: false, error: 'Failed to remove row' };
  }
}

// Helper to reorder rows after removal
async function reorderAfterRemoval(userId: number): Promise<void> {
  const rows = await sql`
    SELECT id FROM user_discovery_rows
    WHERE user_id = ${userId} AND is_visible = true
    ORDER BY position ASC
  `;

  for (let i = 0; i < rows.rows.length; i++) {
    await sql`
      UPDATE user_discovery_rows
      SET position = ${i}
      WHERE id = ${rows.rows[i].id}
    `;
  }
}

// Move a row up or down
export async function moveDiscoveryRow(
  userId: number,
  rowType: DiscoveryRowType,
  direction: 'up' | 'down'
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    // Get all visible rows
    const rows = await sql`
      SELECT id, row_type, position
      FROM user_discovery_rows
      WHERE user_id = ${userId} AND is_visible = true
      ORDER BY position ASC
    `;

    const currentIndex = rows.rows.findIndex(r => r.row_type === rowType);
    if (currentIndex === -1) {
      return { success: false, error: 'Row not found' };
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= rows.rows.length) {
      return { success: false, error: `Cannot move ${direction}` };
    }

    // Swap positions
    const currentRow = rows.rows[currentIndex];
    const targetRow = rows.rows[targetIndex];

    await sql`
      UPDATE user_discovery_rows
      SET position = ${targetRow.position}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${currentRow.id}
    `;

    await sql`
      UPDATE user_discovery_rows
      SET position = ${currentRow.position}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${targetRow.id}
    `;

    return { success: true };
  } catch (error) {
    console.error('Error moving discovery row:', error);
    return { success: false, error: 'Failed to move row' };
  }
}

// Bulk reorder rows
export async function reorderDiscoveryRows(
  userId: number,
  newOrder: { rowType: DiscoveryRowType; position: number }[]
): Promise<{ success: boolean; error?: string }> {
  await ensureDb();

  try {
    for (const item of newOrder) {
      await sql`
        UPDATE user_discovery_rows
        SET position = ${item.position}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId} AND row_type = ${item.rowType}
      `;
    }

    return { success: true };
  } catch (error) {
    console.error('Error reordering discovery rows:', error);
    return { success: false, error: 'Failed to reorder rows' };
  }
}

// Get available rows (not yet added by user)
export async function getAvailableRows(userId: number): Promise<DiscoveryRowType[]> {
  await ensureDb();

  const userRows = await sql`
    SELECT row_type FROM user_discovery_rows
    WHERE user_id = ${userId} AND is_visible = true
  `;

  const addedTypes = new Set(userRows.rows.map(r => r.row_type));

  return ALL_DISCOVERY_ROW_TYPES.filter(type => !addedTypes.has(type));
}
