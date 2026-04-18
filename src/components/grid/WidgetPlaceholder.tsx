'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { getWidgetDef } from '@/lib/widget-registry';
import { getWidgetComponent } from '@/lib/widget-components';
import { useUI } from '@/stores/ui-store';
import { useFilters } from '@/stores/filter-store';
import { Tooltip } from '@/components/ui/Tooltip';
import { useWidgetSize } from '@/lib/hooks/use-widget-size';

interface WidgetPlaceholderProps { widgetId: string; widgetType: string; onRemove?: () => void; }

export function WidgetPlaceholder({ widgetId, widgetType, onRemove }: WidgetPlaceholderProps) {
  const { viewMode } = useUI();
  const { getEffectiveFilters } = useFilters();
  const def = getWidgetDef(widgetType);
  const WidgetContent = getWidgetComponent(widgetType);
  const filters = getEffectiveFilters(widgetId);
  const isCustomizing = viewMode === 'customize';
  const isAI = def?.category === 'ai-agents';
  const { ref: contentRef, size, width } = useWidgetSize();
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isTitleTruncated, setIsTitleTruncated] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const check = () => setIsTitleTruncated(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={clsx('group relative flex h-full w-full flex-col rounded-[var(--radii-widget)] border transition-[border-color,box-shadow] duration-200', isAI ? 'bg-[var(--color-ai-bg)] border-[var(--color-ai-border)]' : 'bg-[var(--color-bg-card)]', isCustomizing ? 'border-dashed border-[var(--color-accent)] cursor-grab active:cursor-grabbing animate-edit-pulse' : 'border-transparent shadow-[var(--shadow-widget)]')}>
      <div className="flex h-9 shrink-0 items-center gap-1.5 px-2.5">
        <span className="material-symbols-rounded text-[16px] leading-none text-[var(--color-fg-muted)]">{def?.icon || 'monitoring'}</span>
        <Tooltip text={isTitleTruncated ? (def?.name || widgetType) : ''} className="min-w-0 overflow-hidden"><span ref={titleRef} className="min-w-0 truncate text-[12px] font-medium text-[var(--color-fg-default)]">{def?.name || widgetType}</span></Tooltip>
        {isAI && <span className="shrink-0 rounded-full bg-[var(--color-ai-accent)]/10 px-1.5 py-px text-[10px] font-semibold text-[var(--color-ai-accent)]">AI</span>}
        <div className="flex-1" />
        <AnimatePresence>{isCustomizing && <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={(e) => { e.stopPropagation(); onRemove?.(); }} className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-subtle)] hover:bg-[var(--color-error)]/20 hover:text-[var(--color-error)]"><span className="material-symbols-rounded text-[16px]">close</span></motion.button>}</AnimatePresence>
      </div>
      <div ref={contentRef} className="flex flex-1 items-center justify-center overflow-hidden rounded-b-[var(--radii-widget)] px-4 pb-4 pt-1" style={{ pointerEvents: isCustomizing ? 'none' : undefined }}>
        {WidgetContent && def ? <WidgetContent widgetId={widgetId} definition={def} filters={filters} size={size} width={width} /> : <span className="text-[11px] text-[var(--color-fg-subtle)]">Widget</span>}
      </div>
      {isCustomizing && <div className="absolute bottom-1.5 right-1.5 h-4 w-4 opacity-50 transition-opacity group-hover:opacity-90"><svg viewBox="0 0 12 12" fill="var(--color-fg-muted)"><circle cx="10" cy="10" r="1.5" /><circle cx="6" cy="10" r="1.5" /><circle cx="10" cy="6" r="1.5" /></svg></div>}
    </div>
  );
}
