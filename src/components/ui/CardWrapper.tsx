'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardWrapperProps {
  children: ReactNode;
  className?: string;
  layoutId?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: boolean;
}

export function CardWrapper({ children, className, layoutId, onClick, hover = true, padding = true }: CardWrapperProps) {
  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      className={clsx(
        'rounded-[var(--radii-widget)] bg-[var(--color-bg-card)]',
        'transition-[background-color,border-color,box-shadow] duration-300',
        'shadow-[var(--shadow-card)]',
        hover && 'hover:bg-[var(--color-bg-card-hover)] hover:shadow-[var(--shadow-elevated)] cursor-pointer',
        padding && 'p-4',
        className,
      )}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
