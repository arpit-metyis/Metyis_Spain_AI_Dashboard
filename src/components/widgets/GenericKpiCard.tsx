'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Payload = { kind: 'kpi'; data: { label: string; formatted: string; formattedDelta: string; isPositive: boolean; vsPrevious: number } };

export default function GenericKpiCard({ definition, filters, size = 'md' }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const point = data?.data;
  const valueSize = size === 'lg' ? 48 : size === 'md' ? 40 : size === 'sm' ? 32 : 26;
  const good = point?.isPositive;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-fg-muted)]">{definition.name}</span>
        <span className="material-symbols-rounded text-[16px] text-[var(--color-fg-subtle)]">{definition.icon}</span>
      </div>
      <div style={{ fontSize: valueSize, lineHeight: 1, fontWeight: 300, color: 'var(--color-fg-default)' }}>
        {loading ? '...' : point?.formatted ?? '-'}
      </div>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span style={{ color: good ? 'var(--color-success)' : 'var(--color-error)' }}>{point?.formattedDelta ?? 'Loading'}</span>
        {point && <span className="text-[var(--color-fg-subtle)]">{point.vsPrevious >= 0 ? '+' : ''}{point.vsPrevious.toFixed(1)}% YoY</span>}
      </div>
    </div>
  );
}
