'use client';

import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { ChatAnswer, ChatProgressStage } from '@/types/chat';
import { AnswerMeta } from './AnswerMeta';
import { QueryProgress } from './QueryProgress';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: ChatAnswer;
}

export function ChatMessageList({
  messages,
  suggestions,
  activeStage,
  onSuggestion,
}: {
  messages: ChatMessage[];
  suggestions: string[];
  activeStage?: ChatProgressStage;
  onSuggestion: (value: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <AnimatePresence>
        {messages.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <span className="material-symbols-rounded text-[24px] text-[var(--color-accent)]">smart_toy</span>
            </div>
            <p className="mb-1 text-[14px] font-medium text-[var(--color-fg-default)]">How can I help?</p>
            <p className="mb-4 text-center text-[12px] text-[var(--color-fg-muted)]">
              Ask about dashboard data, metric definitions, comparisons, or follow-up refinements.
            </p>
            <SuggestionList suggestions={suggestions} onSuggestion={onSuggestion} />
          </motion.div>
        ) : (
          <div className="space-y-3">
            <QueryProgress activeStage={activeStage} />
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  'rounded-lg px-3 py-2 text-[13px] leading-relaxed',
                  message.role === 'user'
                    ? 'ml-6 bg-[var(--color-accent)]/10 text-[var(--color-fg-default)]'
                    : 'mr-6 bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)]',
                )}
              >
                {message.role === 'assistant' ? <FormattedAssistantMessage content={message.content} /> : message.content}
                {message.answer?.clarificationNeeded && message.answer.clarificationQuestion && (
                  <div className="mt-3 rounded border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-2 py-1.5 text-[12px]">
                    {message.answer.clarificationQuestion}
                  </div>
                )}
                {message.role === 'assistant' && message.answer && <AnswerMeta answer={message.answer} />}
              </motion.div>
            ))}
            <SuggestionList suggestions={suggestions} onSuggestion={onSuggestion} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuggestionList({ suggestions, onSuggestion }: { suggestions: string[]; onSuggestion: (value: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSuggestion(suggestion)}
          className="rounded-full px-3 py-1.5 text-[11px] text-[var(--color-fg-muted)] shadow-[var(--shadow-widget)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-default)]"
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const blocks = normalized.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.every(line => /^[-*]\s+/.test(line))) {
          return (
            <ul key={index} className="space-y-1.5 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="list-disc pl-1">{renderInline(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every(line => /^\d+[.)]\s+/.test(line))) {
          return (
            <ol key={index} className="space-y-1.5 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="list-decimal pl-1">{renderInline(line.replace(/^\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          );
        }
        if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
          return <h3 key={index} className="text-[13px] font-semibold text-[var(--color-fg-default)]">{renderInline(lines[0].replace(/^#{1,3}\s+/, ''))}</h3>;
        }
        return <p key={index} className="whitespace-pre-line text-[13px] leading-6">{renderInline(lines.join('\n'))}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-[var(--color-fg-default)]">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
