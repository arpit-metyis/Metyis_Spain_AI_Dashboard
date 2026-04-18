'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '@/stores/ui-store';
import { useIsCompact } from '@/lib/hooks/use-is-compact';
import { WidgetGallery } from '@/components/panels/WidgetGallery';
import { AiAssistant } from '@/components/panels/AiAssistant';
import { BottomDrawer } from '@/components/ui/BottomDrawer';

interface GalleryDragContextValue {
  draggingWidgetType: string | null;
  setDraggingWidgetType: (type: string | null) => void;
}

const GalleryDragContext = createContext<GalleryDragContextValue>({
  draggingWidgetType: null,
  setDraggingWidgetType: () => {},
});

export function useGalleryDrag() {
  return useContext(GalleryDragContext);
}

interface PanelLayoutProps {
  children: ReactNode;
}

export function PanelLayout({ children }: PanelLayoutProps) {
  const { activePanel, setActivePanel, aiPanelWidth } = useUI();
  const [draggingWidgetType, setDraggingWidgetType] = useState<string | null>(null);
  const isCompact = useIsCompact();

  // Track whether draggingWidgetType just transitioned from null → non-null
  // (fresh drag) vs was already set when the gallery reopened (stale leftover).
  const prevDragRef = useRef<string | null>(null);

  useEffect(() => {
    const freshDrag = !!draggingWidgetType && !prevDragRef.current;

    if (isCompact && activePanel === 'gallery' && draggingWidgetType) {
      if (freshDrag) {
        // Drag just started while gallery is open → close drawer for drop target
        setActivePanel(null);
      } else {
        // Gallery reopened with stale drag state → clean it up
        setDraggingWidgetType(null);
      }
    }

    prevDragRef.current = draggingWidgetType;
  }, [isCompact, activePanel, draggingWidgetType, setActivePanel, setDraggingWidgetType]);

  // Best-effort immediate cleanup: 'drop' fires on the target (in DOM, bubbles)
  // and 'dragend' fires on the source (may not bubble if drawer unmounted it).
  // The ref-based logic above handles the case where neither fires.
  useEffect(() => {
    if (!isCompact || !draggingWidgetType) return;
    const cleanup = () => setDraggingWidgetType(null);
    document.addEventListener('drop', cleanup);
    document.addEventListener('dragend', cleanup);
    return () => {
      document.removeEventListener('drop', cleanup);
      document.removeEventListener('dragend', cleanup);
    };
  }, [isCompact, draggingWidgetType, setDraggingWidgetType]);

  return (
    <GalleryDragContext.Provider value={{ draggingWidgetType, setDraggingWidgetType }}>
      <div className="flex h-full overflow-hidden">
        {/* Left panel: Widget Gallery (sidebar on desktop) */}
        {!isCompact && (
          <AnimatePresence mode="wait">
            {activePanel === 'gallery' && (
              <motion.div
                key="gallery"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-full shrink-0 overflow-hidden shadow-[var(--shadow-elevated)]"
              >
                <WidgetGallery />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Main content */}
        <motion.div
          className="flex-1 min-w-0 overflow-auto"
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {children}
        </motion.div>

        {/* Right panel: AI Assistant (sidebar on desktop) */}
        {!isCompact && (
          <AnimatePresence mode="wait">
            {activePanel === 'ai' && (
              <motion.div
                key="ai"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: aiPanelWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-full shrink-0 overflow-hidden shadow-[var(--shadow-elevated)]"
              >
                <AiAssistant />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Compact: Gallery as bottom drawer */}
      {isCompact && (
        <BottomDrawer
          open={activePanel === 'gallery'}
          onClose={() => setActivePanel(null)}
          maxHeight="75vh"
        >
          <WidgetGallery />
        </BottomDrawer>
      )}

      {/* Compact: AI Assistant as full-screen modal */}
      {isCompact && typeof document !== 'undefined' && (
        <AiModal
          open={activePanel === 'ai'}
          onClose={() => setActivePanel(null)}
        />
      )}
    </GalleryDragContext.Provider>
  );
}

/* ── Full-screen AI modal (compact viewports) ── */

function AiModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-[9999] flex flex-col bg-[var(--color-bg-card)]"
          >
            <AiAssistant compact />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
