'use client';

interface ProgressBarProps {
  watched: number;
  total: number;
  showLabel?: boolean;
}

export default function ProgressBar({ watched, total, showLabel = true }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((watched / total) * 100) : 0;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-medium">
            {watched}/{total} ({percentage}%)
          </span>
        </div>
      )}
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#8b5ef4] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
