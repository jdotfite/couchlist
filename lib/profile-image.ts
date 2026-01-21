import { db } from './db';

// Constants for profile image handling
export const PROFILE_IMAGE_CONFIG = {
  // Max upload size: 5MB (before processing)
  maxUploadSize: 5 * 1024 * 1024,
  // Output dimensions (square avatar)
  outputSize: 200,
  // Output quality (0-1 for JPEG)
  outputQuality: 0.85,
  // Max output file size (after compression): ~100KB
  maxOutputSize: 100 * 1024,
  // Allowed MIME types
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

/**
 * Get user's profile image
 */
export async function getProfileImage(userId: number): Promise<string | null> {
  const result = await db`
    SELECT profile_image FROM users WHERE id = ${userId}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].profile_image as string | null;
}

/**
 * Save user's profile image (base64 data URL)
 */
export async function setProfileImage(
  userId: number,
  imageData: string
): Promise<{ success: boolean; error?: string }> {
  // Validate the image data
  if (!imageData.startsWith('data:image/')) {
    return { success: false, error: 'Invalid image format' };
  }

  // Check base64 size (rough estimate - base64 is ~33% larger than binary)
  const base64Part = imageData.split(',')[1];
  if (!base64Part) {
    return { success: false, error: 'Invalid image data' };
  }

  const estimatedSize = (base64Part.length * 3) / 4;
  if (estimatedSize > PROFILE_IMAGE_CONFIG.maxOutputSize * 1.5) {
    return { success: false, error: 'Image too large. Please use a smaller image.' };
  }

  try {
    await db`
      UPDATE users
      SET profile_image = ${imageData}
      WHERE id = ${userId}
    `;
    return { success: true };
  } catch (error) {
    console.error('Failed to save profile image:', error);
    return { success: false, error: 'Failed to save image' };
  }
}

/**
 * Delete user's profile image
 */
export async function deleteProfileImage(userId: number): Promise<boolean> {
  try {
    await db`
      UPDATE users
      SET profile_image = NULL
      WHERE id = ${userId}
    `;
    return true;
  } catch (error) {
    console.error('Failed to delete profile image:', error);
    return false;
  }
}

/**
 * Validate uploaded image file
 */
export function validateImageFile(file: {
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  // Check MIME type
  if (!PROFILE_IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${PROFILE_IMAGE_CONFIG.allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > PROFILE_IMAGE_CONFIG.maxUploadSize) {
    const maxMB = PROFILE_IMAGE_CONFIG.maxUploadSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  return { valid: true };
}
