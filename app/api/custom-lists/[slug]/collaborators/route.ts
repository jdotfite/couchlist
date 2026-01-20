import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getListCollaborators,
  addCollaboratorDirect,
  removeCollaborator,
} from '@/lib/custom-lists';
import { sendListInvite, getSentInvites } from '@/lib/invites';
import { areUsersConnected } from '@/lib/users';

// GET /api/custom-lists/:slug/collaborators - Get all collaborators for a list
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const userId = Number(session.user.id);

    const collaborators = await getListCollaborators(userId, slug);

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
}

// POST /api/custom-lists/:slug/collaborators - Add or invite a collaborator
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { collaboratorId, message, forceInvite } = body;

    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID required' }, { status: 400 });
    }

    const userId = Number(session.user.id);
    const targetId = Number(collaboratorId);

    // Check if users are already connected
    const isConnected = await areUsersConnected(userId, targetId);

    // If connected and not forcing invite, add directly
    if (isConnected && !forceInvite) {
      const result = await addCollaboratorDirect(userId, slug, targetId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, method: 'direct' });
    }

    // Otherwise, send an invite
    const result = await sendListInvite(userId, targetId, slug, message);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, method: 'invite' });
  } catch (error) {
    console.error('Error adding/inviting collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to add collaborator' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-lists/:slug/collaborators - Remove a collaborator
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get('collaboratorId');

    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID required' }, { status: 400 });
    }

    const result = await removeCollaborator(
      Number(session.user.id),
      slug,
      Number(collaboratorId)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}
