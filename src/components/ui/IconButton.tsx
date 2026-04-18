'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface IconButtonProps {
  children: ReactNode;
  variant?: 'ghost' | 'subtle' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  tooltip?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function IconButton({ children, variant = 'ghost', size = 'md', active, tooltip, className, onClick, disabled }: IconButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-[var(--radii-button)] transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
        size === 'sm' && 'h-7 w-7 text-[12px]',
        size === 'md' && 'h-8 w-8 text-[14px]',
        size === 'lg' && 'h-10 w-10 text-[16px]',
        variant === 'ghost' && 'hover:bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]',
        variant === 'subtle' && 'bg-[var(--color-bg-elevated)] hover:bg-[var(--color-stroke-subtle)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]',
        variant === 'filled' && 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-fg-on-accent)]',
        active && 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
