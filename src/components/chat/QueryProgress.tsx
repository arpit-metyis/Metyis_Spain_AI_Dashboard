'use client';

import type { ChatProgressStage } from '@/types/chat';

const labels: Record<ChatProgressStage, string> = {
  understanding_question: 'Understanding question',
  checking_dashboard_context: 'Checking dashboard context',
  running_query: 'Running query',
  validating_result: 'Validating result',
  writing_answer: 'Writing answer',
};

const order = Object.keys(labels) as ChatProgressStage[];

export function QueryProgress({ activeStage }: { activeStage?: ChatProgressStage }) {
  if (!activeStage) return null;
  const activeIndex = order.indexOf(activeStage);
  return (
    <div className="mb-3 rounded-lg border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2">
      <div className="space-y-1.5">
        {order.map((stage, index) => (
          <div key={stage} className="flex items-center gap-2 text-[11px] text-[var(--color-fg-muted)]">
            <span className="material-symbols-rounded text-[13px] text-[var(--color-accent)]">
              {index < activeIndex ? 'check_circle' : index === activeIndex ? 'progress_activity' : 'radio_button_unchecked'}
            </span>
            <span className={index === activeIndex ? 'font-medium text-[var(--color-fg-default)]' : ''}>{labels[stage]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
