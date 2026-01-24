import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { createNotification } from '@/lib/show-alerts';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface NotifyAcceptanceRequest {
  sharedLists: string[];
  createdCollaborativeList: boolean;
  collaborativeListName?: string;
}

// POST /api/friends/[id]/notify-acceptance - Notify friend that you accepted their invite
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const friendUserId = parseInt(id);

    if (isNaN(friendUserId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    const body: NotifyAcceptanceRequest = await request.json();
    const { sharedLists = [], createdCollaborativeList = false, collaborativeListName } = body;

    // Get the accepter's name
    const accepterResult = await sql`
      SELECT name FROM users WHERE id = ${userId}
    `;
    const accepterName = accepterResult.rows[0]?.name || 'Someone';

    // Build notification message
    let message = '';
    if (sharedLists.length > 0) {
      const listNames = sharedLists.map(l => {
        switch (l) {
          case 'watchlist': return 'Watchlist';
          case 'watching': return 'Watching';
          case 'finished': return 'Watched';
          default: return l;
        }
      });
      message = `They shared ${listNames.length} ${listNames.length === 1 ? 'list' : 'lists'}: ${listNames.join(', ')}`;
    }

    if (createdCollaborativeList) {
      const collabName = collaborativeListName || 'a shared list';
      if (message) {
        message += `. Also created "${collabName}" together.`;
      } else {
        message = `Created "${collabName}" together.`;
      }
    }

    if (!message) {
      message = 'You can now share lists with each other.';
    }

    // Create notification for the friend (the one who sent the original invite)
    await createNotification({
      user_id: friendUserId,
      type: 'collab_accepted',
      title: `${accepterName} accepted your friend request!`,
      message,
      data: {
        accepter_id: userId,
        accepter_name: accepterName,
        shared_lists: sharedLists,
        created_collaborative_list: createdCollaborativeList,
        collaborative_list_name: collaborativeListName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending acceptance notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
