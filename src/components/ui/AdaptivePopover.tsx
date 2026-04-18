'use client';

import { ReactNode, useEffect, useRef, useLayoutEffect, useState, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { BottomDrawer } from '@/components/ui/BottomDrawer';

export const PopoverContext = createContext(false);
export function useInsidePopover() {
  return useContext(PopoverContext);
}

interface AdaptivePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number;
  mobileTitle?: string;
}

export function AdaptivePopover({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'right',
  width = 200,
  mobileTitle,
}: AdaptivePopoverProps) {
  const isMobile = useIsMobile();
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    // Horizontal: prefer trigger-aligned, then clamp to viewport
    let x = align === 'right' ? rect.right - width : rect.left;
    x = Math.max(pad, Math.min(x, vw - width - pad));

    // Vertical: prefer below trigger
    let y = rect.bottom + 4;

    // If dropdown would overflow bottom, flip above
    if (dropdownRef.current) {
      const h = dropdownRef.current.offsetHeight;
      if (y + h > vh - pad) y = rect.top - h - 4;
      if (y < pad) y = pad;
    }

    setCoords({ x, y });
  }, [align, width]);

  // Position before paint when opening (dropdown starts at opacity 0)
  useLayoutEffect(() => {
    if (open && !isMobile) reposition();
  }, [open, isMobile, reposition]);

  // Re-measure after dropdown mounts so we get its real height for vertical flip
  useEffect(() => {
    if (open && !isMobile && dropdownRef.current) reposition();
  }, [open, isMobile, reposition]);

  // Click-outside dismiss for desktop
  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open, isMobile, onOpenChange]);

  if (isMobile) {
    return (
      <>
        {trigger}
        <BottomDrawer open={open} onClose={() => onOpenChange(false)}>
          {mobileTitle && (
            <p className="mb-2 text-[13px] font-semibold text-[var(--color-fg-default)]">
              {mobileTitle}
            </p>
          )}
          <PopoverContext.Provider value={true}>
            {children}
          </PopoverContext.Provider>
        </BottomDrawer>
      </>
    );
  }

  return (
    <div ref={triggerRef} className="relative inline-flex">
      {trigger}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{ top: coords.y, left: coords.x, width }}
              className="fixed z-[9999] rounded-[var(--radii-widget)] bg-[var(--color-bg-menu)] py-1 shadow-[var(--shadow-elevated)] backdrop-blur-xl backdrop-saturate-150"
              onClick={(e) => e.stopPropagation()}
            >
              <PopoverContext.Provider value={true}>
                {children}
              </PopoverContext.Provider>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
