'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

type Payload = { churn: { formatted: string; formattedDelta: string; isPositive: boolean }; nps: { formatted: string; formattedDelta: string; isPositive: boolean } };

function Ring({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-1"><div className="flex h-16 w-16 items-center justify-center rounded-full border-[7px]" style={{ borderColor: color }}><span className="text-[18px] font-semibold text-[var(--color-fg-default)]">{value}</span></div><span className="text-[11px] text-[var(--color-fg-muted)]">{label}</span></div>;
}

export default function ChurnOverview({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  return <div className="flex h-full w-full items-center gap-3">{loading ? <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span> : <><Ring label="Churn" value={data?.churn.formatted ?? '-'} color="var(--color-error)" /><Ring label="NPS" value={data?.nps.formatted ?? '-'} color="var(--color-success)" /><div className="min-w-0 flex-1 text-[12px] text-[var(--color-fg-muted)]"><p>{data?.churn.formattedDelta}</p><p>{data?.nps.formattedDelta}</p></div></>}</div>;
}
