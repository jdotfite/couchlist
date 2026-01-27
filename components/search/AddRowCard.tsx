'use client';

import { Plus } from 'lucide-react';

interface AddRowCardProps {
  onClick: () => void;
}

export default function AddRowCard({ onClick }: AddRowCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 border-2 border-dashed border-zinc-700 hover:border-brand-primary rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-brand-primary transition group"
    >
      <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-brand-primary/20 flex items-center justify-center transition">
        <Plus className="w-5 h-5" />
      </div>
      <span className="font-medium">Add Row</span>
    </button>
  );
}
