'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, SkipForward, Loader2 } from 'lucide-react';
import type { ImportProgress as ImportProgressType } from '@/types/import';

interface ImportProgressProps {
  jobId: number;
  onComplete: () => void;
  onError: (error: string) => void;
}

export default function ImportProgress({
  jobId,
  onComplete,
  onError,
}: ImportProgressProps) {
  const [progress, setProgress] = useState<ImportProgressType | null>(null);
  const [polling, setPolling] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/import/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();

      setProgress({
        jobId: data.id,
        status: data.status,
        totalItems: data.totalItems,
        processedItems: data.processedItems,
        successfulItems: data.successfulItems,
        failedItems: data.failedItems,
        skippedItems: data.skippedItems,
        percentage: data.percentage,
      });

      if (data.status === 'completed') {
        setPolling(false);
        onComplete();
      } else if (data.status === 'failed') {
        setPolling(false);
        onError(data.errorMessage || 'Import failed');
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      // Don't stop polling on temporary errors
    }
  }, [jobId, onComplete, onError]);

  useEffect(() => {
    // Initial fetch
    fetchProgress();

    // Set up polling interval
    const interval = setInterval(() => {
      if (polling) {
        fetchProgress();
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [fetchProgress, polling]);

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  const percentage = Math.min(100, progress.percentage);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            Processing {progress.processedItems} of {progress.totalItems}
          </span>
          <span className="text-sm font-medium text-white">{percentage}%</span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-primary rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-white">
              {progress.successfulItems}
            </span>
          </div>
          <p className="text-xs text-gray-400">Imported</p>
        </div>

        <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <SkipForward className="w-4 h-4 text-yellow-400" />
            <span className="text-2xl font-bold text-white">
              {progress.skippedItems}
            </span>
          </div>
          <p className="text-xs text-gray-400">Skipped</p>
        </div>

        <div className="p-4 bg-zinc-800/50 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-2xl font-bold text-white">
              {progress.failedItems}
            </span>
          </div>
          <p className="text-xs text-gray-400">Not Found</p>
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-center gap-2 text-gray-400">
        {progress.status === 'processing' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Searching TMDb and importing movies...</span>
          </>
        )}
        {progress.status === 'pending' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Starting import...</span>
          </>
        )}
      </div>
    </div>
  );
}
