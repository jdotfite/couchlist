'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, SkipForward, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ImportJobItem } from '@/types/import';

interface ImportSummaryProps {
  jobId: number;
  onDismiss: () => void;
  onViewLibrary: () => void;
}

interface JobDetails {
  id: number;
  source: string;
  status: string;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  startedAt: string;
  completedAt: string;
  items?: ImportJobItem[];
}

export default function ImportSummary({
  jobId,
  onDismiss,
  onViewLibrary,
}: ImportSummaryProps) {
  const [details, setDetails] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFailed, setShowFailed] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/import/jobs/${jobId}?includeItems=true&failedOnly=true`);
        if (response.ok) {
          const data = await response.json();
          setDetails(data);
        }
      } catch (error) {
        console.error('Error fetching import details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [jobId]);

  if (loading || !details) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const duration = details.startedAt && details.completedAt
    ? Math.round((new Date(details.completedAt).getTime() - new Date(details.startedAt).getTime()) / 1000)
    : 0;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const isSuccess = details.status === 'completed' && details.successfulItems > 0;
  const hasFailures = details.failedItems > 0;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-xl flex items-center gap-3 ${
        isSuccess ? 'bg-green-900/30 border border-green-800' : 'bg-yellow-900/30 border border-yellow-800'
      }`}>
        {isSuccess ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
        )}
        <div>
          <p className={`font-semibold ${isSuccess ? 'text-green-300' : 'text-yellow-300'}`}>
            {isSuccess ? 'Import Complete' : 'Import Complete with Warnings'}
          </p>
          <p className="text-sm text-gray-400">
            Processed {details.totalItems} items in {formatDuration(duration)}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-800 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold text-white">
              {details.successfulItems}
            </span>
          </div>
          <p className="text-sm text-gray-400">Imported</p>
        </div>

        <div className="p-4 bg-zinc-800 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <SkipForward className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-bold text-white">
              {details.skippedItems}
            </span>
          </div>
          <p className="text-sm text-gray-400">Skipped</p>
        </div>

        <div className="p-4 bg-zinc-800 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold text-white">
              {details.failedItems}
            </span>
          </div>
          <p className="text-sm text-gray-400">Not Found</p>
        </div>
      </div>

      {/* Failed Items List */}
      {hasFailures && details.items && details.items.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden">
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="w-full p-4 flex items-center justify-between hover:bg-zinc-800 transition"
          >
            <span className="font-medium text-white">
              Movies not found ({details.failedItems})
            </span>
            {showFailed ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showFailed && (
            <div className="border-t border-zinc-700 max-h-64 overflow-y-auto">
              {details.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="px-4 py-3 border-b border-zinc-700/50 last:border-0"
                >
                  <p className="text-white text-sm">
                    {item.sourceTitle}
                    {item.sourceYear && (
                      <span className="text-gray-500"> ({item.sourceYear})</span>
                    )}
                  </p>
                  {item.errorMessage && (
                    <p className="text-xs text-red-400 mt-1">{item.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onViewLibrary}
          className="flex-1 py-3 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-medium rounded-xl transition"
        >
          View Library
        </button>
        <button
          onClick={onDismiss}
          className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
