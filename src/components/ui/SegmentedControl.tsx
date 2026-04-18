'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  layoutId?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md', layoutId = 'segment-active' }: SegmentedControlProps<T>) {
  return (
    <div
      className={clsx(
        'relative flex h-8 rounded-[var(--radii-button)] bg-[var(--color-bg-input)] p-0.5',
        'border border-[var(--color-stroke-subtle)]',
      )}
    >
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              'relative z-10 rounded-[calc(var(--radii-button)-2px)] font-medium transition-colors duration-200',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]',
              isActive
                ? 'text-[var(--color-fg-default)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]',
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-[calc(var(--radii-button)-2px)] bg-[var(--color-bg-card)] shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
