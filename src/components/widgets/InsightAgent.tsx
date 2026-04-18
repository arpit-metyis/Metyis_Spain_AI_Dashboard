'use client';

import { useUI } from '@/stores/ui-store';
import type { WidgetContentProps } from '@/types/dashboard';

export default function InsightAgent({ definition }: WidgetContentProps) {
  const { openInsight } = useUI();
  return <button onClick={() => openInsight('Review current Metyis Spain Control Tower performance and identify the most important risks and opportunities.', 'Insight Agent')} className="flex h-full w-full flex-col items-start justify-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-[var(--color-bg-elevated)]"><span className="material-symbols-rounded text-[24px] text-[var(--color-accent)]">auto_awesome</span><span className="text-[14px] font-semibold text-[var(--color-fg-default)]">{definition.name}</span><span className="text-[12px] text-[var(--color-fg-muted)]">Open AI chat with the current dashboard context.</span></button>;
}
