'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Payload = { kpi: { formatted: string; formattedDelta: string }; breakdown: { label: string; value: number; color: string }[] };

export default function PricingDeviations({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  return <div className="flex h-full w-full flex-col justify-center gap-2">{loading ? <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span> : <><div className="flex items-baseline justify-between"><span className="text-[28px] font-light text-[var(--color-fg-default)]">{data?.kpi.formatted}</span><span className="text-[12px] text-[var(--color-fg-muted)]">{data?.kpi.formattedDelta}</span></div><div className="flex h-3 overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">{data?.breakdown.map(row => <div key={row.label} title={`${row.label}: ${row.value}%`} style={{ width: `${row.value}%`, background: row.color }} />)}</div><div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--color-fg-muted)]">{data?.breakdown.map(row => <span key={row.label}>{row.label} {row.value}%</span>)}</div></>}</div>;
}
