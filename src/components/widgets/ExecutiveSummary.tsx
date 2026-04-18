'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Row = { key: string; label: string; formatted: string; formattedDelta: string; isPositive: boolean };
type Payload = { rows: Row[] };

export default function ExecutiveSummary({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const rows = data?.rows ?? [];
  if (loading) return <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span>;
  return (
    <div className="grid h-full w-full grid-cols-2 gap-2 overflow-auto lg:grid-cols-4">
      {rows.slice(0, 8).map(row => (
        <div key={row.key} className="rounded-md bg-[var(--color-bg-elevated)] px-3 py-2">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-subtle)]">{row.label}</p>
          <p className="mt-1 truncate text-[18px] font-semibold text-[var(--color-fg-default)]">{row.formatted}</p>
          <p className="mt-1 truncate text-[11px]" style={{ color: row.isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>{row.formattedDelta}</p>
        </div>
      ))}
    </div>
  );
}
