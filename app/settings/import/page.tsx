'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import FileUploadZone from '@/components/import/FileUploadZone';
import ImportConfigForm from '@/components/import/ImportConfigForm';
import ImportProgress from '@/components/import/ImportProgress';
import ImportSummary from '@/components/import/ImportSummary';
import type { ImportSource, ConflictStrategy } from '@/types/import';

type Step = 'source' | 'upload' | 'config' | 'processing' | 'complete';

const sources: Array<{ id: ImportSource; name: string; description: string; available: boolean }> = [
  {
    id: 'letterboxd',
    name: 'Letterboxd',
    description: 'Import your movie diary, ratings, watchlist, and watched list',
    available: true,
  },
  {
    id: 'trakt',
    name: 'Trakt',
    description: 'Import your watch history and ratings (coming soon)',
    available: false,
  },
  {
    id: 'imdb',
    name: 'IMDb',
    description: 'Import your ratings and watchlist (coming soon)',
    available: false,
  },
];

export default function ImportPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<ImportSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [config, setConfig] = useState({
    conflictStrategy: 'skip' as ConflictStrategy,
    importRatings: true,
    importWatchlist: true,
    importWatched: true,
    markRewatchAsTag: true,
  });
  const [jobId, setJobId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSourceSelect = (selectedSource: ImportSource) => {
    setSource(selectedSource);
    setStep('upload');
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadError(null);
  };

  const handleFileClear = () => {
    setFile(null);
    setUploadError(null);
  };

  const handleStartImport = async () => {
    if (!file || !source) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', source);
      formData.append('conflictStrategy', config.conflictStrategy);
      formData.append('importRatings', config.importRatings.toString());
      formData.append('importWatchlist', config.importWatchlist.toString());
      formData.append('importWatched', config.importWatched.toString());
      formData.append('markRewatchAsTag', config.markRewatchAsTag.toString());

      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setJobId(data.jobId);
      setStep('processing');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleImportComplete = useCallback(() => {
    setStep('complete');
  }, []);

  const handleImportError = useCallback((error: string) => {
    setUploadError(error);
    setStep('complete');
  }, []);

  const handleViewLibrary = () => {
    router.push('/movies');
  };

  const handleDismiss = () => {
    router.push('/settings');
  };

  const handleBack = () => {
    switch (step) {
      case 'upload':
        setStep('source');
        setFile(null);
        break;
      case 'config':
        setStep('upload');
        break;
      default:
        break;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin-fast-fast text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black px-4 py-3">
        <div className="flex items-center gap-3">
          {step === 'source' || step === 'processing' || step === 'complete' ? (
            <Link href="/settings" className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </Link>
          ) : (
            <button onClick={handleBack} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold">Import Data</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Step: Source Selection */}
        {step === 'source' && (
          <div className="space-y-4">
            <p className="text-gray-400 mb-6">
              Import your movie history from another service
            </p>

            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => s.available && handleSourceSelect(s.id)}
                disabled={!s.available}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  s.available
                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                    : 'bg-zinc-900/50 border-zinc-800/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{s.description}</p>
                  </div>
                  {s.available && <ChevronRight className="w-5 h-5 text-gray-400" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: File Upload */}
        {step === 'upload' && source && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Upload Your Export</h2>
              <p className="text-sm text-gray-400">
                {source === 'letterboxd' && (
                  <>
                    Go to Letterboxd Settings → Import & Export → Export Your Data,
                    then upload the ZIP file here.
                  </>
                )}
              </p>
            </div>

            <FileUploadZone
              source={source}
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClear={handleFileClear}
            />

            {uploadError && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                <p className="text-sm text-red-300">{uploadError}</p>
              </div>
            )}

            <button
              onClick={() => setStep('config')}
              disabled={!file}
              className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step: Configuration */}
        {step === 'config' && source && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Import Options</h2>
              <p className="text-sm text-gray-400">
                Choose what to import and how to handle duplicates
              </p>
            </div>

            <ImportConfigForm
              {...config}
              onChange={setConfig}
              disabled={uploading}
            />

            {uploadError && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                <p className="text-sm text-red-300">{uploadError}</p>
              </div>
            )}

            <button
              onClick={handleStartImport}
              disabled={uploading || (!config.importWatched && !config.importWatchlist)}
              className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin-fast text-gray-400" />
                  Starting Import...
                </>
              ) : (
                'Start Import'
              )}
            </button>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && jobId && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Importing Movies</h2>
              <p className="text-sm text-gray-400">
                Please wait while we import your movies. This may take a few minutes.
              </p>
            </div>

            <ImportProgress
              jobId={jobId}
              onComplete={handleImportComplete}
              onError={handleImportError}
            />
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && jobId && (
          <ImportSummary
            jobId={jobId}
            onViewLibrary={handleViewLibrary}
            onDismiss={handleDismiss}
          />
        )}
      </main>
    </div>
  );
}
