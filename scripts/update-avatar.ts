// Admin script to update a user's profile avatar
// Run with: npx tsx --env-file=.env.local scripts/update-avatar.ts

import { db, initDb } from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function updateAvatar(userName: string, imagePath: string) {
  await initDb();

  console.log(`Looking up user: ${userName}`);

  // Find user by name (case-insensitive)
  const userResult = await db`
    SELECT id, name, email FROM users
    WHERE LOWER(name) = LOWER(${userName})
  `;

  if (userResult.rows.length === 0) {
    console.log('User not found');
    return;
  }

  const user = userResult.rows[0];
  console.log(`Found user: ${user.name} (${user.email}), ID: ${user.id}`);

  // Read and convert image to base64 data URL
  const absolutePath = path.resolve(imagePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Image file not found: ${absolutePath}`);
    return;
  }

  const imageBuffer = fs.readFileSync(absolutePath);
  const ext = path.extname(imagePath).toLowerCase();

  let mimeType: string;
  switch (ext) {
    case '.png':
      mimeType = 'image/png';
      break;
    case '.jpg':
    case '.jpeg':
      mimeType = 'image/jpeg';
      break;
    case '.webp':
      mimeType = 'image/webp';
      break;
    case '.gif':
      mimeType = 'image/gif';
      break;
    default:
      console.error(`Unsupported image format: ${ext}`);
      return;
  }

  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
  console.log(`Updating profile image...`);

  // Update the user's profile image
  await db`
    UPDATE users
    SET profile_image = ${dataUrl}
    WHERE id = ${user.id}
  `;

  console.log(`Successfully updated avatar for ${user.name}`);
}

// Get args from command line or use defaults
const userName = process.argv[2] || 'Troy Sears';
const imagePath = process.argv[3] || 'C:\\Users\\Justin\\Desktop\\troy.png';

updateAvatar(userName, imagePath)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
