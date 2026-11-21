import React from 'react';
import { BRAND } from '../../config/brand';

interface BrandLogoProps {
  size?: 'sm' | 'md';
  tone?: 'dark' | 'light';
}

export function BrandLogo({ size = 'md', tone = 'dark' }: BrandLogoProps) {
  const textColor = tone === 'light' ? 'text-white' : 'text-ink';
  const boxClasses =
    size === 'sm' ? 'w-7 h-7 rounded-lg text-xs' : 'w-8 h-8 rounded-lg text-sm';
  const textClasses = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <span
        className={`${boxClasses} bg-brand-700 text-white font-display font-bold flex items-center justify-center shrink-0`}
        aria-hidden="true"
      >
        ₦
      </span>
      <span
        className={`${textClasses} font-display font-bold tracking-tight ${textColor}`}
      >
        {BRAND.name}
      </span>
    </span>
  );
}
