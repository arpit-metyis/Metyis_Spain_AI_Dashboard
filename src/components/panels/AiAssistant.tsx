'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/stores/ui-store';
import { useFilters } from '@/stores/filter-store';
import { useSelection } from '@/stores/selection-store';
import clsx from 'clsx';

const DEFAULT_SUGGESTIONS = [
  'Summarize this dashboard',
  'What are the top KPIs?',
  'Compare business units',
  'Show margin trends',
  'Which offerings are underperforming?',
  'Suggest optimizations',
];

const AGENT_FOLLOWUPS: Record<string, string[]> = {
  'Campaign Optimizer': ["What's the optimal budget split?", 'Show ROAS by channel', 'Which campaigns should I pause?'],
  'Trend Spotter': ['How does this compare to last quarter?', 'Which demographics drive this trend?', "Predict next month's trajectory"],
  'Audience Insight': ['Break down by age group', 'Compare across regions', 'What channels reach this segment?'],
  'Anomaly Detector': ['What caused this anomaly?', 'Show historical baseline', 'How should I respond to this?'],
  'Content Advisor': ['Show top-performing content examples', 'Suggest a content calendar', 'What formats work best?'],
};

function generateInsightMessage(text: string, agentName: string): string {
  return `The ${agentName} flagged the following insight:\n\n"${text}"`;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isFallback?: boolean;
  model?: string;
  source?: 'openrouter' | 'mock';
}

interface AiAssistantProps {
  compact?: boolean;
}

export function AiAssistant({ compact }: AiAssistantProps = {}) {
  const { setActivePanel, aiPanelWidth, setAiPanelWidth, insightPrompt, clearInsightPrompt } = useUI();
  const { globalFilters } = useFilters();
  const { activeGeo, activeKpi, activeProduct, activeBusinessUnit } = useSelection();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const processedPromptRef = useRef<string | null>(null);

  const requestAssistant = useCallback(async (content: string, history: Message[]) => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        messages: history.map(({ role, content }) => ({ role, content })),
        context: {
          timeframe: globalFilters.timeframe,
          geo: activeGeo ?? globalFilters.geo,
          activeKpi,
          product: activeProduct,
          businessUnit: activeBusinessUnit,
        },
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json() as Promise<{ content: string; isFallback?: boolean; model?: string; source?: 'openrouter' | 'mock' }>;
  }, [activeBusinessUnit, activeGeo, activeKpi, activeProduct, globalFilters]);

  const handleSend = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content || isSending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = { id: loadingId, role: 'assistant', content: 'Thinking through the dashboard context...' };
    const nextMessages = [...messages, userMsg, loadingMsg];

    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const reply = await requestAssistant(content, [...messages, userMsg]);
      setMessages(current => current.map(msg => msg.id === loadingId ? {
        ...msg,
        content: reply.content,
        isFallback: reply.isFallback,
        model: reply.model,
        source: reply.source,
      } : msg));
    } catch {
      setMessages(current => current.map(msg => msg.id === loadingId ? {
        ...msg,
        content: `Mock response: I could not reach the AI service. For "${content}", review revenue, margin, units, and churn together against the selected business context.`,
        isFallback: true,
        source: 'mock',
      } : msg));
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, requestAssistant]);

  // Seed conversation from insight prompt
  useEffect(() => {
    if (!insightPrompt) return;

    const key = `${insightPrompt.agentName}:${insightPrompt.text}`;
    if (processedPromptRef.current === key) return;
    processedPromptRef.current = key;

    const insightMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: generateInsightMessage(insightPrompt.text, insightPrompt.agentName),
    };

    setMessages([]);
    setActiveSuggestions(AGENT_FOLLOWUPS[insightPrompt.agentName] ?? DEFAULT_SUGGESTIONS);
    clearInsightPrompt();
    void handleSend(insightMsg.content);
  }, [insightPrompt, clearInsightPrompt, handleSend]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startWidth: aiPanelWidth };

    const handleMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.max(300, Math.min(600, resizeRef.current.startWidth + delta));
      setAiPanelWidth(newWidth);
    };

    const handleUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [aiPanelWidth, setAiPanelWidth]);

  return (
    <div className="relative flex h-full flex-col bg-[var(--color-bg-card)]">
      {/* Resize handle */}
      {!compact && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-accent)]/30 transition-colors z-10"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/20">
            <span className="material-symbols-rounded text-[14px] text-[var(--color-accent)]">auto_awesome</span>
          </div>
          <h2 className="text-[13px] font-semibold text-[var(--color-fg-default)]">AI Assistant</h2>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-elevated)] transition-colors"
        >
          <span className="material-symbols-rounded text-[14px]">close</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center pt-8"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                <span className="material-symbols-rounded text-[24px] text-[var(--color-accent)]">smart_toy</span>
              </div>
              <p className="mb-1 text-[14px] font-medium text-[var(--color-fg-default)]">How can I help?</p>
              <p className="mb-4 text-[12px] text-[var(--color-fg-muted)] text-center">
                Ask me about your dashboard data, trends, or insights.
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {activeSuggestions.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSend(s)}
                    className="rounded-full shadow-[var(--shadow-widget)] px-3 py-1.5 text-[11px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-default)] transition-colors"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    'rounded-lg px-3 py-2 text-[13px] leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-[var(--color-accent)]/10 text-[var(--color-fg-default)] ml-6'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-default)] mr-6',
                  )}
                >
                  {msg.role === 'assistant' ? <FormattedAssistantMessage content={msg.content} /> : msg.content}
                  {msg.role === 'assistant' && <ResponseSourceNote isFallback={msg.isFallback} model={msg.model} source={msg.source} />}
                </motion.div>
              ))}
              {/* Follow-up suggestions after messages */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeSuggestions.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSend(s)}
                    className="rounded-full shadow-[var(--shadow-widget)] px-3 py-1.5 text-[11px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-default)] transition-colors"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-input)] px-3 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your data..."
            className="flex-1 bg-transparent text-[13px] text-[var(--color-fg-default)] placeholder-[var(--color-fg-subtle)] outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-accent)] disabled:opacity-30 hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            <span className="material-symbols-rounded text-[14px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResponseSourceNote({ isFallback, model, source }: { isFallback?: boolean; model?: string; source?: 'openrouter' | 'mock' }) {
  const isMock = isFallback || source === 'mock';
  return (
    <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--color-stroke-subtle)] pt-2 text-[11px] font-medium text-[var(--color-fg-muted)]">
      <span className="material-symbols-rounded text-[13px]">{isMock ? 'offline_bolt' : 'cloud_done'}</span>
      <span>{isMock ? 'Local mock response' : `AI LLM response${model ? ` · ${model}` : ''}`}</span>
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
