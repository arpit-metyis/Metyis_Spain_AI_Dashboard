'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface GridOverlayProps {
  visible: boolean;
  /** Horizontal cell pitch (colWidth + marginX) */
  cellWidth?: number;
  /** Vertical cell pitch (rowHeight + marginY) */
  cellHeight?: number;
  /** Left offset to first column edge */
  offsetX?: number;
  /** Top offset to first row edge */
  offsetY?: number;
  /** Horizontal gap between cells */
  marginX?: number;
  /** Vertical gap between cells */
  marginY?: number;
}

export function GridOverlay({
  visible,
  cellWidth = 0,
  cellHeight = 0,
  offsetX = 0,
  offsetY = 0,
  marginX = 0,
  marginY = 0,
}: GridOverlayProps) {
  // Fall back to a reasonable default if dimensions aren't provided yet
  const w = cellWidth > 0 ? cellWidth : 24;
  const h = cellHeight > 0 ? cellHeight : 24;

  // Place dots at gutter midpoints — the center of each gap between cells.
  // First gutter center is at padX + colWidth + marginX/2 = offsetX + cellPitch - marginX/2.
  // Tile dot is at (w/2, h/2) from tile origin, so: bgX + w/2 = offsetX + w - marginX/2.
  const bgX = offsetX + w / 2 - marginX / 2;
  const bgY = offsetY + h / 2 - marginY / 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-stroke-subtle) 1px, transparent 1px)',
            backgroundSize: `${w}px ${h}px`,
            backgroundPosition: `${bgX}px ${bgY}px`,
          }}
        />
      )}
    </AnimatePresence>
  );
}
