'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Row = { key: string; label: string; formatted: string; formattedDelta: string; isPositive: boolean; vsTarget: number };
type Payload = { rows: Row[] };

export default function RiskAlerts({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const rows = data?.rows ?? [];
  if (loading) return <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span>;
  if (rows.length === 0) return <div className="flex h-full w-full items-center justify-center text-[13px] text-[var(--color-success)]">No KPI risks against target</div>;
  return (
    <div className="h-full w-full overflow-auto">
      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.key} className="flex items-center gap-2 rounded-md bg-[var(--color-bg-elevated)] px-2 py-1.5">
            <span className="material-symbols-rounded text-[16px] text-[var(--color-error)]">warning</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[var(--color-fg-default)]">{row.label}</p>
              <p className="truncate text-[11px] text-[var(--color-fg-muted)]">{row.formatted} · {row.formattedDelta}</p>
            </div>
            <span className="text-[12px] font-semibold text-[var(--color-error)]">{row.vsTarget.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
