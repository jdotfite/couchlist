import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/library';
import { parseLetterboxdExport } from '@/lib/import/parsers/letterboxd';
import { parseIMDbExport } from '@/lib/import/parsers/imdb';
import {
  createImportJob,
  processImportJob,
} from '@/lib/import/processor';
import type { ImportConfig, ImportSource, ImportItem, IMDbItem } from '@/types/import';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdByEmail(session.user.email);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const source = formData.get('source') as ImportSource | null;
    const conflictStrategy = formData.get('conflictStrategy') as string | null;
    const importRatings = formData.get('importRatings') === 'true';
    const importWatchlist = formData.get('importWatchlist') === 'true';
    const importWatched = formData.get('importWatched') === 'true';
    const markRewatchAsTag = formData.get('markRewatchAsTag') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!source) {
      return NextResponse.json({ error: 'Missing source parameter' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Validate file type based on source
    if (source === 'letterboxd') {
      if (!file.name.endsWith('.zip')) {
        return NextResponse.json(
          { error: 'Letterboxd imports require a ZIP file.' },
          { status: 400 }
        );
      }
    } else if (source === 'imdb') {
      if (!file.name.endsWith('.csv')) {
        return NextResponse.json(
          { error: 'IMDb imports require a CSV file.' },
          { status: 400 }
        );
      }
    }

    // Parse the config
    const config: ImportConfig = {
      source,
      conflictStrategy: (conflictStrategy as ImportConfig['conflictStrategy']) || 'skip',
      importRatings,
      importWatchlist,
      importWatched,
      markRewatchAsTag,
    };

    // Read file content
    const arrayBuffer = await file.arrayBuffer();

    // Parse based on source
    let items: (ImportItem | IMDbItem)[] = [];
    let parseErrors: string[] = [];

    if (source === 'letterboxd') {
      const result = await parseLetterboxdExport(arrayBuffer);
      items = result.items;
      parseErrors = result.errors;
    } else if (source === 'imdb') {
      const result = await parseIMDbExport(arrayBuffer, file.name);
      items = result.items;
      parseErrors = result.errors;
    } else {
      return NextResponse.json(
        { error: `Import source "${source}" is not yet supported` },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: 'No items found in export',
          parseErrors,
        },
        { status: 400 }
      );
    }

    // Create import job
    const jobId = await createImportJob(userId, source, items.length);

    // Start processing in the background
    // We don't await this - the client will poll for progress
    processImportJob(jobId, userId, items, config).catch(error => {
      console.error('Background import processing failed:', error);
    });

    return NextResponse.json({
      jobId,
      totalItems: items.length,
      parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
      message: 'Import started',
    });
  } catch (error) {
    console.error('Import upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    );
  }
}
