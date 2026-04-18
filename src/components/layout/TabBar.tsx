'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useDashboard } from '@/stores/dashboard-store';
import { useUI } from '@/stores/ui-store';

const TAB_MIN_WIDTH = 80;
const RESERVED_WIDTH = 100; // add-tab + overflow button

export function TabBar() {
  const { activeDashboardId, activeTabId, setActiveTab, addTab, removeTab, renameTab, reorderTabs, getActiveDashboard } = useDashboard();
  const { viewMode, setActivePanel } = useUI();
  const dashboard = getActiveDashboard();
  const isCustomizing = viewMode === 'customize';
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmingTabId, setConfirmingTabId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(Infinity);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCustomizing) setConfirmingTabId(null);
  }, [isCustomizing]);

  // Measure how many tabs fit
  const measure = useCallback(() => {
    if (!containerRef.current || !dashboard) return;
    const totalWidth = containerRef.current.getBoundingClientRect().width;
    const available = totalWidth - RESERVED_WIDTH;
    const count = Math.max(1, Math.floor(available / TAB_MIN_WIDTH));
    setVisibleCount(count);
  }, [dashboard]);

  useEffect(() => {
    if (!containerRef.current) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  // Close overflow on click-outside
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: PointerEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [overflowOpen]);

  if (!dashboard) return null;

  const tabs = dashboard.tabs;
  const hasOverflow = tabs.length > visibleCount;
  const visibleTabs = hasOverflow ? tabs.slice(0, visibleCount) : tabs;
  const hiddenTabs = hasOverflow ? tabs.slice(visibleCount) : [];

  const handleDoubleClick = (tabId: string, name: string) => {
    setConfirmingTabId(null);
    setEditingTabId(tabId);
    setEditValue(name);
  };

  const handleRenameSubmit = (tabId: string) => {
    if (activeDashboardId && editValue.trim()) {
      renameTab(activeDashboardId, tabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div ref={containerRef} className="flex h-11 items-end gap-0 bg-[var(--color-bg-card)] px-2 shadow-[var(--shadow-widget)]">
      <AnimatePresence mode="popLayout">
        {visibleTabs.map(tab => {
          const isActive = tab.id === (activeTabId || tabs[0]?.id);
          return (
            <motion.div
              key={tab.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              draggable={isCustomizing}
              onDragStart={(e) => {
                if (!isCustomizing) return;
                setDragTabId(tab.id);
                (e as unknown as React.DragEvent).dataTransfer?.setData('text/plain', tab.id);
              }}
              onDragOver={(e) => {
                if (!isCustomizing || !dragTabId) return;
                (e as unknown as React.DragEvent).preventDefault?.();
                e.preventDefault();
                if (tab.id !== dragTabId) setDropTargetId(tab.id);
              }}
              onDragLeave={() => { if (dropTargetId === tab.id) setDropTargetId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (!activeDashboardId || !dragTabId || dragTabId === tab.id) return;
                const ids = tabs.map(t => t.id);
                const fromIdx = ids.indexOf(dragTabId);
                const toIdx = ids.indexOf(tab.id);
                if (fromIdx === -1 || toIdx === -1) return;
                ids.splice(fromIdx, 1);
                ids.splice(toIdx, 0, dragTabId);
                reorderTabs(activeDashboardId, ids);
                setDragTabId(null);
                setDropTargetId(null);
              }}
              onDragEnd={() => { setDragTabId(null); setDropTargetId(null); }}
              className={clsx(
                'group relative flex items-center gap-1 px-3 py-2 text-[12px] cursor-pointer',
                'transition-colors duration-200 rounded-t-md',
                isActive
                  ? 'bg-[var(--color-bg-screen)] text-[var(--color-fg-default)] font-medium border-b-2 border-[var(--color-accent)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-elevated)]',
                dragTabId === tab.id && 'opacity-40',
                dropTargetId === tab.id && 'ring-2 ring-[var(--color-accent)]/40',
              )}
              onClick={() => {
                setConfirmingTabId(null);
                setActiveTab(tab.id);
              }}
              onDoubleClick={() => handleDoubleClick(tab.id, tab.name)}
            >
              {confirmingTabId === tab.id ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-[12px]"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      if (activeDashboardId) removeTab(activeDashboardId, tab.id);
                      setConfirmingTabId(null);
                    }}
                    className="text-[var(--color-error)] hover:underline"
                  >
                    Delete
                  </button>
                  <span className="text-[var(--color-fg-subtle)]">/</span>
                  <button
                    onClick={() => setConfirmingTabId(null)}
                    className="text-[var(--color-fg-muted)] hover:underline"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : editingTabId === tab.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(tab.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameSubmit(tab.id);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                  className="w-20 bg-transparent outline-none text-[12px]"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-[120px]">{tab.name}</span>
              )}

              {isCustomizing && tabs.length > 1 && confirmingTabId !== tab.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTabId(null);
                    setConfirmingTabId(tab.id);
                  }}
                  className="ml-1 flex h-4 w-4 items-center justify-center rounded text-[var(--color-fg-subtle)] hover:bg-[var(--color-error)]/20 hover:text-[var(--color-error)] transition-colors"
                >
                  <span className="material-symbols-rounded text-[14px]">delete</span>
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Overflow "+N" button */}
      {hasOverflow && (
        <div ref={overflowRef} className="relative mb-0.5 ml-1">
          <button
            onClick={() => setOverflowOpen(!overflowOpen)}
            className={clsx(
              'flex h-8 items-center rounded px-2 text-[12px] font-medium transition-colors',
              overflowOpen
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-elevated)]',
            )}
          >
            +{hiddenTabs.length}
          </button>

          <AnimatePresence>
            {overflowOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-[var(--radii-widget)] bg-[var(--color-bg-menu)] py-1 shadow-[var(--shadow-elevated)] backdrop-blur-xl backdrop-saturate-150"
              >
                {hiddenTabs.map(tab => {
                  const isActive = tab.id === (activeTabId || tabs[0]?.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setOverflowOpen(false);
                      }}
                      className={clsx(
                        'block w-full mx-1 rounded-[var(--radii-button)] px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--color-bg-elevated)]',
                        isActive ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-fg-default)]',
                      )}
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      {tab.name}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isCustomizing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (activeDashboardId) {
                addTab(activeDashboardId);
                setActivePanel('gallery');
              }
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-elevated)] transition-colors ml-1 mb-0.5"
          >
            <span className="material-symbols-rounded text-[16px]">add</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
