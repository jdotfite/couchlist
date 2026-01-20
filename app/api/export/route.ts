import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db as sql } from '@/lib/db';

// GET /api/export - Export user's watch history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all user's media with status, rating, notes, and tags
    const result = await sql`
      SELECT
        media.tmdb_id,
        media.media_type,
        media.title,
        media.poster_path,
        user_media.status,
        user_media.rating,
        user_media.notes,
        user_media.created_at AS added_at,
        user_media.status_updated_at,
        COALESCE(
          ARRAY_AGG(DISTINCT tags.slug) FILTER (WHERE tags.slug IS NOT NULL),
          ARRAY[]::text[]
        ) AS tags
      FROM user_media
      JOIN media ON media.id = user_media.media_id
      LEFT JOIN user_media_tags ON user_media_tags.user_media_id = user_media.id
      LEFT JOIN tags ON tags.id = user_media_tags.tag_id AND tags.user_id IS NULL
      WHERE user_media.user_id = ${userId}
      GROUP BY
        media.tmdb_id,
        media.media_type,
        media.title,
        media.poster_path,
        user_media.status,
        user_media.rating,
        user_media.notes,
        user_media.created_at,
        user_media.status_updated_at
      ORDER BY user_media.created_at DESC
    `;

    const items = result.rows.map(row => ({
      tmdb_id: row.tmdb_id,
      media_type: row.media_type,
      title: row.title,
      status: row.status,
      rating: row.rating,
      notes: row.notes,
      tags: row.tags,
      added_at: row.added_at,
      status_updated_at: row.status_updated_at,
      tmdb_url: `https://www.themoviedb.org/${row.media_type}/${row.tmdb_id}`,
    }));

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Title', 'Type', 'Status', 'Rating', 'Tags', 'Notes', 'Added At', 'TMDB ID', 'TMDB URL'];
      const csvRows = [
        headers.join(','),
        ...items.map(item => [
          `"${(item.title || '').replace(/"/g, '""')}"`,
          item.media_type === 'tv' ? 'TV Show' : 'Movie',
          item.status || '',
          item.rating || '',
          `"${(item.tags || []).join(', ')}"`,
          `"${(item.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          item.added_at ? new Date(item.added_at).toISOString() : '',
          item.tmdb_id,
          item.tmdb_url,
        ].join(','))
      ];

      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="flicklog-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default: JSON
    const exportData = {
      exported_at: new Date().toISOString(),
      user_email: session.user.email,
      total_items: items.length,
      items,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="flicklog-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
