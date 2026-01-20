import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUsername, setUsername, clearUsername, isUsernameAvailable, isValidUsername } from '@/lib/users';

// GET /api/users/username - Get current user's username
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const username = await getUsername(userId);

    return NextResponse.json({ username });
  } catch (error) {
    console.error('Error getting username:', error);
    return NextResponse.json(
      { error: 'Failed to get username' },
      { status: 500 }
    );
  }
}

// POST /api/users/username - Set/update/clear username
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    const userId = Number(session.user.id);

    // If username is null/empty, clear it
    if (!username) {
      const clearResult = await clearUsername(userId);
      if (!clearResult.success) {
        return NextResponse.json({ error: clearResult.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, username: null });
    }

    const result = await setUsername(userId, username);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return the verified username from the database
    return NextResponse.json({ success: true, username: result.username });
  } catch (error) {
    console.error('Error setting username:', error);
    return NextResponse.json(
      { error: 'Failed to set username' },
      { status: 500 }
    );
  }
}

// PUT /api/users/username/check - Check if username is available
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check format validity
    const validation = isValidUsername(username);
    if (!validation.valid) {
      return NextResponse.json({ available: false, error: validation.error });
    }

    // Check availability
    const userId = Number(session.user.id);
    const available = await isUsernameAvailable(username, userId);

    return NextResponse.json({
      available,
      error: available ? null : 'This username is already taken'
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    );
  }
}
