'use client';

import { useCallback, useState } from 'react';
import { Upload, FileArchive, X, AlertCircle } from 'lucide-react';
import type { ImportSource } from '@/types/import';

interface FileUploadZoneProps {
  source: ImportSource;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const sourceConfig: Record<ImportSource, { accept: string; label: string; description: string }> = {
  letterboxd: {
    accept: '.zip',
    label: 'ZIP file',
    description: 'Upload your Letterboxd export ZIP file',
  },
  trakt: {
    accept: '.json',
    label: 'JSON file',
    description: 'Upload your Trakt export JSON file',
  },
  imdb: {
    accept: '.csv',
    label: 'CSV file',
    description: 'Upload your IMDb export CSV file',
  },
  csv: {
    accept: '.csv',
    label: 'CSV file',
    description: 'Upload a CSV file with movie data',
  },
};

export default function FileUploadZone({
  source,
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = sourceConfig[source];

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!config.accept.includes(extension)) {
      return `Invalid file type. Please upload a ${config.label}.`;
    }

    return null;
  }, [config]);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (selectedFile) {
    return (
      <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary/20 rounded-lg flex items-center justify-center">
            <FileArchive className="w-5 h-5 text-brand-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{selectedFile.name}</p>
            <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
          </div>
          {!disabled && (
            <button
              onClick={onClear}
              className="p-2 hover:bg-zinc-700 rounded-lg transition"
              aria-label="Remove file"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative p-8 rounded-xl border-2 border-dashed transition-all
          ${isDragOver
            ? 'border-brand-primary bg-brand-primary/10'
            : 'border-zinc-700 hover:border-zinc-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept={config.accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-white font-medium mb-1">
            Drop your {config.label} here
          </p>
          <p className="text-sm text-gray-400 mb-2">
            or click to browse
          </p>
          <p className="text-xs text-gray-500">
            {config.description} (max 10MB)
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
