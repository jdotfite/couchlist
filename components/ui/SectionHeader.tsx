'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  ctaText,
  ctaHref,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-400">{subtitle}</p>
        )}
      </div>
      {ctaText && ctaHref && (
        <Link
          href={ctaHref}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition"
        >
          {ctaText}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
