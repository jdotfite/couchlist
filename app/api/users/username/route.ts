import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUsername, setUsername, isUsernameAvailable, isValidUsername } from '@/lib/users';

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

// POST /api/users/username - Set/update username
export async function POST(request: Request) {
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

    const userId = Number(session.user.id);
    const result = await setUsername(userId, username);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, username: username.toLowerCase() });
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
