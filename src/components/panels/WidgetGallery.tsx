'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useDashboard } from '@/stores/dashboard-store';
import { useUI } from '@/stores/ui-store';
import { widgetCategories, getWidgetsByCategory, getAgentEntries } from '@/lib/widget-registry';
import { useGalleryDrag } from '@/components/layout/PanelLayout';
import { SearchInput } from '@/components/ui/SearchInput';
import { WidgetThumbnail } from '@/components/panels/WidgetThumbnail';
import type { WidgetDefinition } from '@/types/dashboard';

export function WidgetGallery() {
  const { activeDashboardId, activeTabId, getActiveTab, addWidget } = useDashboard();
  const { setActivePanel } = useUI();
  const { draggingWidgetType, setDraggingWidgetType } = useGalleryDrag();
  const activeTab = getActiveTab();
  const grouped = getWidgetsByCategory();
  const agents = getAgentEntries();
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [galleryTab, setGalleryTab] = useState<'widgets' | 'agents'>('widgets');
  const [search, setSearch] = useState('');

  const existingTypes = new Set(activeTab?.widgets.map(w => w.type) || []);

  const handleDragStart = useCallback((e: React.DragEvent, type: string, name: string) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingWidgetType(type);

    // Create styled drag ghost
    const ghost = document.createElement('div');
    ghost.textContent = name;
    ghost.style.cssText = 'position:fixed;left:-9999px;padding:6px 12px;border-radius:8px;background:var(--color-accent);color:#fff;font-size:12px;font-weight:500;white-space:nowrap;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    ghostRef.current = ghost;
  }, [setDraggingWidgetType]);

  const handleDragEnd = useCallback(() => {
    setDraggingWidgetType(null);
    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current);
      ghostRef.current = null;
    }
  }, [setDraggingWidgetType]);

  const { viewMode } = useUI();

  const handleAdd = (type: string) => {
    if (viewMode !== 'customize') return;
    if (activeDashboardId && activeTabId) {
      addWidget(activeDashboardId, activeTabId, type);
    }
  };

  const query = search.toLowerCase().trim();
  const matchesSearch = (item: WidgetDefinition) =>
    !query || item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);

  const renderItem = (item: WidgetDefinition, index: number, groupIndex: number) => {
    if (existingTypes.has(item.type) || !matchesSearch(item)) return null;
    return (
      <motion.button
        key={item.type}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: groupIndex * 0.05 + index * 0.03 }}
        onClick={() => handleAdd(item.type)}
        draggable
        onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, item.type, item.name)}
        onDragEnd={handleDragEnd}
        className={clsx(
          'flex w-full items-center gap-2.5 rounded-[var(--radii-button)] px-2 py-1.5 text-left transition-all',
          'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
          draggingWidgetType === item.type && 'opacity-40 scale-95',
        )}
      >
        <div className="relative h-[42px] w-[74px] flex-shrink-0 overflow-hidden rounded-md">
          <WidgetThumbnail widgetType={item.type} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[var(--color-fg-default)] truncate">
            {item.name}
          </p>
          <p className="text-[11px] text-[var(--color-fg-subtle)] truncate">
            {item.description}
          </p>
        </div>
      </motion.button>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-card)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex rounded-lg bg-[var(--color-bg-screen)] p-0.5">
          <button
            onClick={() => setGalleryTab('widgets')}
            className={clsx(
              'rounded-md px-2.5 py-1 text-[12px] transition-all',
              galleryTab === 'widgets'
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)] font-medium shadow-sm'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]',
            )}
          >
            Widgets
          </button>
          <button
            onClick={() => setGalleryTab('agents')}
            className={clsx(
              'rounded-md px-2.5 py-1 text-[12px] transition-all',
              galleryTab === 'agents'
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)] font-medium shadow-sm'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]',
            )}
          >
            AI Agents
          </button>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          <span className="material-symbols-rounded text-[14px]">close</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search widgets…" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {galleryTab === 'widgets' ? (
          widgetCategories.map((category, catIdx) => {
            const widgets = grouped[category.id] || [];
            if (widgets.length === 0) return null;

            return (
              <div key={category.id} className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  {category.name}
                </p>
                <div className="space-y-1">
                  {widgets.map((widget, i) => renderItem(widget, i, catIdx))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
              AI Agents
            </p>
            <div className="space-y-1">
              {agents.map((agent, i) => renderItem(agent, i, 0))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
