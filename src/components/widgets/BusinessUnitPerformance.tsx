'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Row = { unit: string; label: string; color: string; formatted: string; value: number; isPositive: boolean; formattedDelta: string };
type Payload = { rows: Row[] };

export default function BusinessUnitPerformance({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const rows = data?.rows ?? [];
  const max = Math.max(...rows.map(row => row.value), 1);
  if (loading) return <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span>;
  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-auto">
      {rows.map(row => (
        <div key={row.unit} className="grid grid-cols-[1fr_72px] items-center gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} /><span className="truncate text-[12px] font-semibold text-[var(--color-fg-default)]">{row.label}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-elevated)]"><div className="h-full rounded-full" style={{ width: `${Math.max(5, row.value / max * 100)}%`, background: row.color }} /></div>
          </div>
          <div className="text-right"><p className="text-[12px] font-semibold text-[var(--color-fg-default)]">{row.formatted}</p><p className="text-[10px]" style={{ color: row.isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>{row.formattedDelta}</p></div>
        </div>
      ))}
    </div>
  );
}
