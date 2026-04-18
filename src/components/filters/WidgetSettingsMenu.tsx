'use client';

import { useState } from 'react';
import { useFilters } from '@/stores/filter-store';
import { getWidgetDef } from '@/lib/widget-registry';
import { AdaptivePopover } from '@/components/ui/AdaptivePopover';
import { AdaptiveSelect } from '@/components/ui/AdaptiveSelect';
import { timeframeOptions, geoOptions, channelOptions, frequencyOptions } from '@/lib/filter-options';
import type { TimeFrame, GeoRegion, Channel, Frequency } from '@/types/dashboard';
import { ALL_CHANNELS } from '@/types/dashboard';

interface WidgetSettingsMenuProps {
  widgetId: string;
  widgetType: string;
}

export function WidgetSettingsMenu({ widgetId, widgetType }: WidgetSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const { getEffectiveFilters, setWidgetOverride, clearWidgetOverride } = useFilters();
  const def = getWidgetDef(widgetType);
  const filters = getEffectiveFilters(widgetId);

  if (!def) return null;

  const trigger = (
    <button
      onClick={() => setOpen(!open)}
      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-fg-default)] transition-colors"
    >
      <span className="material-symbols-rounded text-[14px]">more_vert</span>
    </button>
  );

  return (
    <AdaptivePopover open={open} onOpenChange={setOpen} trigger={trigger} mobileTitle="Widget Filters">
      <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
        Widget Filters
      </p>

      {def.supportedFilters.includes('timeframe') && (
        <AdaptiveSelect
          variant="inline"
          label="Timeframe"
          options={timeframeOptions}
          value={filters.timeframe}
          onChange={(v) => setWidgetOverride(widgetId, { timeframe: v as TimeFrame })}
        />
      )}

      {def.supportedFilters.includes('geo') && (
        <AdaptiveSelect
          variant="inline"
          label="Region"
          options={geoOptions}
          value={filters.geo}
          onChange={(v) => setWidgetOverride(widgetId, { geo: v as GeoRegion })}
        />
      )}

      {def.supportedFilters.includes('channel') && (
        <AdaptiveSelect
          variant="inline"
          label="Channel"
          options={channelOptions}
          values={filters.channel ?? [...ALL_CHANNELS]}
          onChangeMulti={(vs) => setWidgetOverride(widgetId, { channel: vs as Channel[] })}
          multiSelect
        />
      )}

      {def.supportedFilters.includes('frequency') && (
        <AdaptiveSelect
          variant="inline"
          label="Frequency"
          options={frequencyOptions}
          value={filters.frequency}
          onChange={(v) => setWidgetOverride(widgetId, { frequency: v as Frequency })}
        />
      )}

      <div className="mt-1 border-t border-[var(--color-stroke-subtle)] pt-1 px-3">
        <button
          onClick={() => { clearWidgetOverride(widgetId); setOpen(false); }}
          className="w-full rounded-[var(--radii-button)] px-2 py-1 text-left text-[12px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-fg-default)]"
        >
          Reset to global
        </button>
      </div>
    </AdaptivePopover>
  );
}
