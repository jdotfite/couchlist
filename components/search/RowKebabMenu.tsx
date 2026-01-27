'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, ChevronUp, ChevronDown, EyeOff } from 'lucide-react';

interface RowKebabMenuProps {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHide: () => void;
}

export default function RowKebabMenu({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onHide,
}: RowKebabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-zinc-800 rounded-full transition"
        aria-label="Row options"
      >
        <MoreVertical className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-1 z-50"
        >
          <button
            onClick={() => handleAction(onMoveUp)}
            disabled={isFirst}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
              isFirst
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-white hover:bg-zinc-700'
            }`}
          >
            <ChevronUp className="w-4 h-4" />
            Move Up
          </button>

          <button
            onClick={() => handleAction(onMoveDown)}
            disabled={isLast}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
              isLast
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-white hover:bg-zinc-700'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
            Move Down
          </button>

          <div className="border-t border-zinc-700 my-1" />

          <button
            onClick={() => handleAction(onHide)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-400 hover:bg-zinc-700 transition"
          >
            <EyeOff className="w-4 h-4" />
            Hide Row
          </button>
        </div>
      )}
    </div>
  );
}
