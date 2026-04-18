'use client';

import { useUI } from '@/stores/ui-store';
import type { WidgetSize } from '@/types/dashboard';

export type InsightSeverity = 'info' | 'warning' | 'positive' | 'negative';

export interface InsightItem {
  icon: string;
  text: string;
  severity?: InsightSeverity;
}

interface AgentInsightProps {
  insights: InsightItem[];
  agentName: string;
  size?: WidgetSize;
}

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  info: 'var(--color-dataviz-info)',
  warning: 'var(--color-dataviz-warning)',
  positive: 'var(--color-dataviz-positive)',
  negative: 'var(--color-dataviz-negative)',
};

const CLAMP_CLASS: Record<WidgetSize, string> = {
  xs: 'line-clamp-2',
  sm: 'line-clamp-3',
  md: '',
  lg: '',
};

export function AgentInsight({ insights, agentName, size = 'md' }: AgentInsightProps) {
  const { openInsight } = useUI();
  const clamp = CLAMP_CLASS[size];

  return (
    <div className="flex h-full w-full flex-col gap-1 py-0.5">
      {insights.map((item, i) => (
        <button
          key={i}
          type="button"
          title="Click to explore this insight"
          onClick={() => openInsight(item.text, agentName)}
          className="group/insight flex flex-1 items-center gap-2.5 mx-0.5 px-1.5 rounded-md text-left cursor-pointer bg-[var(--color-fg-default)]/[0.036] transition-[background-color] duration-150 hover:bg-[var(--color-ai-accent)]/[0.07]"
        >
          <span
            className="material-symbols-rounded shrink-0 text-[16px]"
            style={{ color: SEVERITY_COLOR[item.severity ?? 'info'] }}
          >
            {item.icon}
          </span>
          <span className={`flex-1 text-[13px] leading-snug text-[var(--color-fg-default)] ${clamp}`}>
            {item.text}
          </span>
          <span className="material-symbols-rounded shrink-0 text-[14px] text-[var(--color-fg-subtle)] opacity-0 transition-opacity group-hover/insight:opacity-100">
            arrow_forward
          </span>
        </button>
      ))}
    </div>
  );
}
