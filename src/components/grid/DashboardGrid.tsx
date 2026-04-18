'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { GridLayout } from 'react-grid-layout';
import type { LayoutItem, Layout } from 'react-grid-layout';
import { useUI } from '@/stores/ui-store';
import { useDashboard } from '@/stores/dashboard-store';
import { WidgetPlaceholder } from './WidgetPlaceholder';
import { GridOverlay } from './GridOverlay';
import { widgetRegistry } from '@/lib/widget-registry';
import { useGalleryDrag } from '@/components/layout/PanelLayout';
import { verticalCompactor } from 'react-grid-layout';
import { GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING, calculateRowHeight, getBreakpointFromWidth } from '@/lib/grid';
import 'react-grid-layout/css/styles.css';

/**
 * Clamp & reflow a 24-col layout into fewer columns.
 * Non-overflowing items keep their x and are pushed down only if earlier
 * items now occupy their space.  Overflowing items are bin-packed into the
 * first available gap via a column height-map so they appear right after
 * the row they originally belonged to.
 */
function adaptLayout(items: LayoutItem[], cols: number): LayoutItem[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const heights = new Array(cols).fill(0);

  return sorted.map(item => {
    const { x, h, ...rest } = item;
    let { y, w } = item;
    if (w > cols) w = cols;

    if (x + w <= cols) {
      // Fits Ã¢â‚¬â€ keep original x, push y down to clear occupied space
      for (let c = x; c < x + w; c++) y = Math.max(y, heights[c]);
      for (let c = x; c < x + w; c++) heights[c] = y + h;
      return { ...rest, x, y, w, h };
    }

    // Overflowed Ã¢â‚¬â€ find the column offset with the lowest available y
    let bestX = 0;
    let bestY = Infinity;
    for (let cx = 0; cx <= cols - w; cx++) {
      let top = 0;
      for (let c = cx; c < cx + w; c++) top = Math.max(top, heights[c]);
      if (top < bestY) { bestY = top; bestX = cx; }
    }
    for (let c = bestX; c < bestX + w; c++) heights[c] = bestY + h;
    return { ...rest, x: bestX, y: bestY, w, h };
  });
}

export function DashboardGrid() {
  const { viewMode } = useUI();
  const { activeDashboardId, activeTabId, getActiveTab, updateLayout, removeWidget, addWidget } = useDashboard();
  const { draggingWidgetType } = useGalleryDrag();
  const [rowHeight, setRowHeight] = useState(80);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCustomizing = viewMode === 'customize';

  const activeTab = getActiveTab();

  useEffect(() => {
    const update = () => setRowHeight(calculateRowHeight(window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.getBoundingClientRect().width);
    let rafId = 0;
    const observer = new ResizeObserver(entries => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const w = entries[entries.length - 1].contentRect.width;
        setContainerWidth(prev => Math.round(prev) === Math.round(w) ? prev : w);
      });
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(rafId); };
  }, []);

  // Use viewport width for breakpoint so column count stays stable when
  // side-panels (gallery, AI chat) open/close. containerWidth still drives
  // the pixel sizing of each cell via the `width` prop on GridLayout.
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const breakpoint = getBreakpointFromWidth(viewportWidth);
  const cols = GRID_COLS[breakpoint];

  // Compute real cell pitch so the dot overlay aligns with snap positions.
  // Mirrors react-grid-layout's internal calcGridColWidth.
  const [marginX, marginY] = GRID_MARGIN;
  const [padX, padY] = GRID_CONTAINER_PADDING;
  const colWidth = containerWidth > 0
    ? (containerWidth - padX * 2 - marginX * (cols - 1)) / cols
    : 0;
  const cellPitchX = colWidth + marginX;   // px between column starts
  const cellPitchY = rowHeight + marginY;  // px between row starts

  const layout = useMemo(() => {
    if (!activeTab) return [];
    const items: LayoutItem[] = activeTab.widgets.map(w => {
      const def = widgetRegistry[w.type];
      let minW = def?.minW ?? 2;
      // Reduce minW at smaller breakpoints so widgets can fit
      if (breakpoint === 'xs') minW = 2;
      else if (breakpoint === 'sm' || breakpoint === 'md') minW = Math.min(minW, 4);
      return {
        i: w.id,
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        minW,
        maxW: def?.maxW ?? 24,
        minH: def?.minH ?? 1,
        maxH: def?.maxH ?? 12,
      };
    });
    return adaptLayout(items, cols);
  }, [activeTab, cols, breakpoint]);

  const persistLayout = useCallback((newLayout: Layout) => {
    if (!activeDashboardId || !activeTabId || !isCustomizing) return;
    const updates = newLayout.map(l => ({
      id: l.i,
      layout: { x: l.x, y: l.y, w: l.w, h: l.h },
    }));
    updateLayout(activeDashboardId, activeTabId, updates);
  }, [activeDashboardId, activeTabId, isCustomizing, updateLayout]);

  const handleDragStop = useCallback(
    (newLayout: Layout) => persistLayout(newLayout),
    [persistLayout]
  );

  const handleResizeStop = useCallback(
    (newLayout: Layout) => persistLayout(newLayout),
    [persistLayout]
  );

  const handleRemoveWidget = useCallback((widgetId: string) => {
    if (!activeDashboardId || !activeTabId) return;
    removeWidget(activeDashboardId, activeTabId, widgetId);
  }, [activeDashboardId, activeTabId, removeWidget]);

  const isDragActive = isCustomizing && !!draggingWidgetType;

  const droppingItem = useMemo<LayoutItem | undefined>(() => {
    if (!draggingWidgetType) return undefined;
    const def = widgetRegistry[draggingWidgetType];
    if (!def) return undefined;
    return { i: '__dropping-elem__', x: 0, y: 0, w: def.defaultW, h: def.defaultH };
  }, [draggingWidgetType]);

  const handleDrop = useCallback((newLayout: Layout, item: LayoutItem | undefined) => {
    if (!activeDashboardId || !activeTabId || !draggingWidgetType || !item) return;
    // Persist displaced positions of existing widgets first
    const existingUpdates = newLayout
      .filter(l => l.i !== '__dropping-elem__')
      .map(l => ({ id: l.i, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }));
    if (existingUpdates.length > 0) {
      updateLayout(activeDashboardId, activeTabId, existingUpdates);
    }
    // Then add the new widget at the drop position
    addWidget(activeDashboardId, activeTabId, draggingWidgetType, { x: item.x, y: item.y });
  }, [activeDashboardId, activeTabId, draggingWidgetType, addWidget, updateLayout]);

  const handleDropDragOver = useCallback(() => {
    if (!draggingWidgetType) return undefined;
    const def = widgetRegistry[draggingWidgetType];
    if (!def) return undefined;
    return { w: def.defaultW, h: def.defaultH };
  }, [draggingWidgetType]);

  // Handle drop on empty grid or below existing widgets
  const handleFallbackDragOver = useCallback((e: React.DragEvent) => {
    if (!isDragActive) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [isDragActive]);

  const handleFallbackDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!activeDashboardId || !activeTabId || !type) return;
    addWidget(activeDashboardId, activeTabId, type);
  }, [activeDashboardId, activeTabId, addWidget]);

  if (!activeTab || activeTab.widgets.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`relative flex h-full w-full items-center justify-center transition-all ${isDragActive ? 'ring-2 ring-[var(--color-accent)]/30 ring-inset rounded-lg' : ''}`}
        onDragOver={handleFallbackDragOver}
        onDrop={handleFallbackDrop}
      >
        <GridOverlay visible={isCustomizing} cellWidth={cellPitchX} cellHeight={cellPitchY} offsetX={padX} offsetY={padY} marginX={marginX} marginY={marginY} />
        <div className="text-center pointer-events-none">
          <p className="text-[16px] text-[var(--color-fg-muted)]">
            {isDragActive ? 'Drop widget here' : 'No widgets yet'}
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-fg-subtle)]">
            {isDragActive ? '' : isCustomizing ? 'Open the widget gallery to add widgets' : 'Switch to Customize mode to add widgets'}
          </p>
        </div>
      </div>
    );
  }

  // Don't render the grid until we have a measured width
  if (containerWidth === 0) {
    return <div ref={containerRef} className="h-full w-full" />;
  }

  return (
    <div ref={containerRef} className={`relative min-h-full w-full transition-all ${isDragActive ? 'ring-2 ring-[var(--color-accent)]/30 ring-inset rounded-lg' : ''}`} onDragOver={handleFallbackDragOver} onDrop={handleFallbackDrop}>
      <GridOverlay visible={isCustomizing} cellWidth={cellPitchX} cellHeight={cellPitchY} offsetX={padX} offsetY={padY} marginX={marginX} marginY={marginY} />
      <GridLayout
        layout={layout}
        gridConfig={{
          cols,
          rowHeight,
          margin: GRID_MARGIN,
          containerPadding: GRID_CONTAINER_PADDING,
          maxRows: Infinity,
        }}
        dragConfig={{ enabled: isCustomizing, bounded: false, threshold: 3 }}
        resizeConfig={{ enabled: isCustomizing, handles: ['se'] }}
        dropConfig={{ enabled: isDragActive, defaultItem: { w: droppingItem?.w ?? 2, h: droppingItem?.h ?? 2 } }}
        droppingItem={droppingItem}
        compactor={verticalCompactor}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        onDrop={handleDrop}
        onDropDragOver={handleDropDragOver}
        width={containerWidth}
      >
        {activeTab.widgets.map(widget => (
          <div key={widget.id}>
            <WidgetPlaceholder
              widgetId={widget.id}
              widgetType={widget.type}
              onRemove={() => handleRemoveWidget(widget.id)}
            />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
