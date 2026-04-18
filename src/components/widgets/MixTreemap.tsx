'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Row = { key: string; label: string; value: number; pct: number; color: string };
type Payload = { rows: Row[] };

export default function MixTreemap({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const rows = data?.rows ?? [];
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  if (loading) return <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span>;
  return <div className="flex h-full w-full gap-1 overflow-hidden rounded-md">{rows.map(row => <div key={row.key} className="flex min-w-[52px] flex-col justify-end rounded p-2 text-white" style={{ flex: row.value / total, background: row.color }}><span className="truncate text-[11px] font-semibold">{row.label}</span><span className="text-[10px] opacity-85">{row.pct}%</span></div>)}</div>;
}
