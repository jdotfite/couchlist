import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSharedListTypes } from '@/lib/collaborators';

// GET /api/collaborators/shared-lists - Get which lists are shared for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ sharedLists: [] });
    }

    const sharedLists = await getSharedListTypes(Number(session.user.id));

    return NextResponse.json({ sharedLists });
  } catch (error) {
    console.error('Error fetching shared lists:', error);
    return NextResponse.json({ sharedLists: [] });
  }
}
