'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Row = { key: string; label: string; attainment: number; isPositive: boolean; formatted: string };
type Payload = { rows: Row[] };

export default function TargetAttainment({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const rows = data?.rows ?? [];
  if (loading) return <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span>;
  return (
    <div className="flex h-full w-full flex-col gap-1 overflow-auto">
      {rows.map(row => {
        const width = Math.max(4, Math.min(row.attainment, 130));
        return <div key={row.key} className="grid grid-cols-[92px_1fr_48px] items-center gap-2 text-[11px]"><span className="truncate text-[var(--color-fg-muted)]">{row.label}</span><div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-elevated)]"><div className="h-full rounded-full" style={{ width: `${width}%`, background: row.isPositive ? 'var(--color-success)' : 'var(--color-error)' }} /></div><span className="text-right font-semibold text-[var(--color-fg-default)]">{row.attainment}%</span></div>;
      })}
    </div>
  );
}
