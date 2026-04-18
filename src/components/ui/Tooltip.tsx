'use client';

import { useState, useRef, useCallback, useLayoutEffect, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: ReactNode;
  text: string;
  subtext?: string;
  className?: string;
}

export function Tooltip({ children, text, subtext, className }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  useLayoutEffect(() => {
    if (show) updatePosition();
  }, [show, updatePosition]);

  const handleEnter = () => {
    timeout.current = setTimeout(() => setShow(true), 200);
  };

  const handleLeave = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setShow(false);
  };

  const handleTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    setShow(true);
    // Auto-dismiss after 2 seconds
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setShow(false), 2000);
  };

  // Dismiss on outside tap while shown
  useEffect(() => {
    if (!show) return;
    const handler = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setShow(false);
        if (timeout.current) clearTimeout(timeout.current);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [show]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex${className ? ` ${className}` : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onTouchStart={handleTouch}
    >
      {children}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {show && text && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              style={{ left: coords.x, top: coords.y }}
              className="fixed z-[9999] -translate-x-1/2 -translate-y-full pb-1.5 pointer-events-none"
            >
              <div className="whitespace-nowrap rounded-[var(--radii-widget)] bg-[var(--color-bg-tooltip)] px-2.5 py-1.5 shadow-[var(--shadow-elevated)]">
                <p className="text-[11px] font-medium text-[var(--color-fg-default)]">{text}</p>
                {subtext && (
                  <p className="mt-0.5 text-[10px] text-[var(--color-fg-muted)]">{subtext}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
