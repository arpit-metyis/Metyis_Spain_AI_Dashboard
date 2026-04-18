'use client';

import { motion } from 'framer-motion';

interface WidgetRemoveButtonProps {
  onRemove: () => void;
}

export function WidgetRemoveButton({ onRemove }: WidgetRemoveButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-error)] text-white text-[10px] font-bold shadow-sm hover:bg-[var(--color-error)]/80 transition-colors"
    >
      ✕
    </motion.button>
  );
}
