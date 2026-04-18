'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Row = { code: string; name: string; rank: number; formatted: string; formattedDelta: string; isPositive: boolean };
type Payload = { rows: Row[] };

export default function CountryRanking({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  return <div className="h-full w-full overflow-hidden"><div className="grid grid-cols-[32px_1fr_auto] gap-2 border-b border-[var(--color-stroke-subtle)] pb-1 text-[10px] uppercase text-[var(--color-fg-subtle)]"><span>#</span><span>Market</span><span>Value</span></div><div className="mt-1 space-y-1 overflow-auto">{loading ? <p className="text-[12px] text-[var(--color-fg-muted)]">Loading...</p> : data?.rows.map(row => <div key={row.code} className="grid grid-cols-[32px_1fr_auto] items-center gap-2 rounded px-1 py-1 text-[12px] hover:bg-[var(--color-bg-elevated)]"><span className="text-[var(--color-fg-subtle)]">{row.rank}</span><span className="truncate text-[var(--color-fg-default)]">{row.name}</span><span style={{ color: row.isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>{row.formatted}</span></div>)}</div></div>;
}
