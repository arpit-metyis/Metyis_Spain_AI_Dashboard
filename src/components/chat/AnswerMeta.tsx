'use client';

import type { ChatAnswer } from '@/types/chat';

export function AnswerMeta({ answer }: { answer: ChatAnswer }) {
  const isMock = answer.source === 'insufficient_data';
  return (
    <div className="mt-3 space-y-2 border-t border-[var(--color-stroke-subtle)] pt-2 text-[11px] text-[var(--color-fg-muted)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-medium">
          <span className="material-symbols-rounded text-[13px]">{isMock ? 'rule' : 'verified'}</span>
          {isMock ? 'Deterministic fallback' : 'Conversational BI answer'}
        </span>
        <span>Source: {answer.source.replace(/_/g, ' ')}</span>
        <span>Confidence: {answer.confidence}</span>
      </div>
      {Object.keys(answer.filtersApplied).length > 0 && (
        <div>Filters: {Object.entries(answer.filtersApplied).map(([key, value]) => `${key}=${String(value)}`).join(', ')}</div>
      )}
      {answer.caveats.length > 0 && (
        <div>
          Caveats: {answer.caveats.join(' ')}
        </div>
      )}
      {answer.citations && answer.citations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {answer.citations.map(citation => (
            <span key={`${citation.type}-${citation.label}-${citation.value}`} className="rounded border border-[var(--color-stroke-subtle)] px-1.5 py-0.5">
              {citation.label}: {citation.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
