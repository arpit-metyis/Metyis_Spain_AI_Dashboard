'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Payload = { rows?: { period: string; value: number; target: number }[]; series?: { period: string; value: number; target: number }[] };

export default function TrendLine({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const rows = data?.rows ?? data?.series ?? [];
  if (loading) return <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span>;
  return <div className="h-full w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}><XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: 'var(--color-fg-muted)' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--color-bg-tooltip)', border: '1px solid var(--color-stroke-subtle)', borderRadius: 6, fontSize: 12 }} /><Area type="monotone" dataKey="value" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.18} strokeWidth={2} /><Area type="monotone" dataKey="target" stroke="var(--color-fg-subtle)" fill="transparent" strokeDasharray="4 4" /></AreaChart></ResponsiveContainer></div>;
}
