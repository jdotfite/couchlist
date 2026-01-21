import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProfileImage,
  setProfileImage,
  deleteProfileImage,
  PROFILE_IMAGE_CONFIG,
} from '@/lib/profile-image';

// GET /api/users/profile-image - Get current user's profile image
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const profileImage = await getProfileImage(userId);

    return NextResponse.json({ profileImage });
  } catch (error) {
    console.error('Error getting profile image:', error);
    return NextResponse.json(
      { error: 'Failed to get profile image' },
      { status: 500 }
    );
  }
}

// POST /api/users/profile-image - Upload/update profile image
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Validate image format
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be a data URL.' },
        { status: 400 }
      );
    }

    // Extract MIME type
    const mimeMatch = imageData.match(/^data:(image\/[a-z+]+);base64,/);
    if (!mimeMatch) {
      return NextResponse.json(
        { error: 'Invalid image data URL format' },
        { status: 400 }
      );
    }

    const mimeType = mimeMatch[1];
    if (!PROFILE_IMAGE_CONFIG.allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Invalid image type. Allowed: JPEG, PNG, WebP, GIF` },
        { status: 400 }
      );
    }

    // Check approximate size (base64 is ~33% larger than binary)
    const base64Part = imageData.split(',')[1];
    const estimatedBytes = (base64Part.length * 3) / 4;

    // Allow some overhead for the processed image
    const maxAllowedBytes = PROFILE_IMAGE_CONFIG.maxOutputSize * 2;
    if (estimatedBytes > maxAllowedBytes) {
      return NextResponse.json(
        { error: 'Image too large. Please use a smaller or more compressed image.' },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    const result = await setProfileImage(userId, imageData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile image' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/profile-image - Remove profile image
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const success = await deleteProfileImage(userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete profile image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile image' },
      { status: 500 }
    );
  }
}
