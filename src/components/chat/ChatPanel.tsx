'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatAnswer, ChatProgressStage, ChatRequest, ChatStreamEvent, DashboardState } from '@/types/chat';
import { useDashboard } from '@/stores/dashboard-store';
import { useFilters } from '@/stores/filter-store';
import { useSelection } from '@/stores/selection-store';
import { useUI } from '@/stores/ui-store';
import { widgetRegistry } from '@/lib/widget-registry';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList, type ChatMessage } from './ChatMessageList';

const DEFAULT_SUGGESTIONS = [
  'Summarize this dashboard',
  'What changed this week?',
  'Break revenue down by region for the last 12 weeks',
  'What does conversion rate mean?',
  'Which metrics need attention?',
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

export function ChatPanel({ compact }: { compact?: boolean }) {
  const { setActivePanel, aiPanelWidth, setAiPanelWidth, insightPrompt, clearInsightPrompt } = useUI();
  const { globalFilters } = useFilters();
  const { activeGeo, activeKpi, activeProduct, activeBusinessUnit } = useSelection();
  const dashboard = useDashboard();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeStage, setActiveStage] = useState<ChatProgressStage | undefined>();
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const conversationIdRef = useRef(`chat-${Date.now().toString(36)}`);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const processedPromptRef = useRef<string | null>(null);

  const dashboardState = useMemo<DashboardState>(() => {
    const activeDashboard = dashboard.getActiveDashboard();
    const activeTab = dashboard.getActiveTab();
    const widgets = activeTab?.widgets ?? [];
    const visibleMetrics = Array.from(new Set([
      activeKpi,
      ...widgets.map(widget => widget.type.startsWith('kpi-') ? widget.type.replace('kpi-', '') : null).filter((value): value is string => Boolean(value)),
    ]));
    return {
      dashboardId: activeDashboard?.id ?? 'control-tower',
      pageId: activeTab?.id ?? 'overview',
      filters: {
        ...globalFilters,
        geo: activeGeo ?? globalFilters.geo,
        activeKpi,
        businessUnit: activeBusinessUnit,
        product: activeProduct,
      },
      visibleMetrics,
      visibleDimensions: ['country', 'month', 'region', 'product_category'],
      widgetMeta: {
        title: activeTab?.name ?? 'Control Tower',
        chartType: widgets.map(widget => widgetRegistry[widget.type]?.name ?? widget.type).join(', '),
      },
    };
  }, [activeBusinessUnit, activeGeo, activeKpi, activeProduct, dashboard, globalFilters]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim();
    if (!content || isSending) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content };
    const assistantId = `${Date.now() + 1}`;
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '' };
    setMessages(current => [...current, userMessage, assistantMessage]);
    setInput('');
    setIsSending(true);
    setActiveStage('understanding_question');

    try {
      const request: ChatRequest = {
        conversationId: conversationIdRef.current,
        message: content,
        dashboardState,
        clientContext: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: navigator.language,
        },
      };
      await streamAssistant(request, event => {
        if (event.type === 'status') setActiveStage(event.stage);
        if (event.type === 'token') {
          setMessages(current => current.map(message => message.id === assistantId ? { ...message, content: `${message.content}${event.token}` } : message));
        }
        if (event.type === 'final') {
          const answer = event.payload.answer;
          setMessages(current => current.map(message => message.id === assistantId ? { ...message, content: message.content || answer.answer, answer } : message));
          if (answer.followUps.length) setActiveSuggestions(answer.followUps);
        }
        if (event.type === 'error') throw new Error(event.error);
      });
    } catch {
      const answer: ChatAnswer = {
        answer: `I could not complete the conversational BI request. For "${content}", please retry or narrow the question to a visible KPI.`,
        source: 'insufficient_data',
        filtersApplied: dashboardState.filters,
        confidence: 'low',
        caveats: ['The chat backend or model provider was unavailable.'],
        followUps: DEFAULT_SUGGESTIONS.slice(0, 3),
      };
      setMessages(current => current.map(message => message.id === assistantId ? { ...message, content: answer.answer, answer } : message));
    } finally {
      setIsSending(false);
      setActiveStage(undefined);
    }
  }, [dashboardState, input, isSending]);

  useEffect(() => {
    if (!insightPrompt) return;
    const key = `${insightPrompt.agentName}:${insightPrompt.text}`;
    if (processedPromptRef.current === key) return;
    processedPromptRef.current = key;
    setMessages([]);
    setActiveSuggestions(AGENT_FOLLOWUPS[insightPrompt.agentName] ?? DEFAULT_SUGGESTIONS);
    clearInsightPrompt();
    void sendMessage(generateInsightMessage(insightPrompt.text, insightPrompt.agentName));
  }, [clearInsightPrompt, insightPrompt, sendMessage]);

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    resizeRef.current = { startX: event.clientX, startWidth: aiPanelWidth };
    const handleMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - moveEvent.clientX;
      setAiPanelWidth(Math.max(300, Math.min(600, resizeRef.current.startWidth + delta)));
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
      {!compact && <div onMouseDown={handleResizeStart} className="absolute bottom-0 left-0 top-0 z-10 w-1 cursor-col-resize transition-colors hover:bg-[var(--color-accent)]/30" />}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/20">
            <span className="material-symbols-rounded text-[14px] text-[var(--color-accent)]">auto_awesome</span>
          </div>
          <h2 className="text-[13px] font-semibold text-[var(--color-fg-default)]">AI Assistant</h2>
        </div>
        <button onClick={() => setActivePanel(null)} className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-fg-subtle)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-default)]" aria-label="Close AI Assistant">
          <span className="material-symbols-rounded text-[14px]">close</span>
        </button>
      </div>
      <ChatMessageList messages={messages} suggestions={activeSuggestions} activeStage={activeStage} onSuggestion={sendMessage} />
      <ChatComposer input={input} isSending={isSending} onInputChange={setInput} onSend={() => sendMessage()} />
    </div>
  );
}

async function streamAssistant(request: ChatRequest, onEvent: (event: ChatStreamEvent) => void) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(await response.text());
  if (!response.body) throw new Error('Chat stream was empty');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const chunk of events) {
      const dataLine = chunk.split('\n').find(line => line.startsWith('data: '));
      if (!dataLine) continue;
      onEvent(JSON.parse(dataLine.replace(/^data:\s*/, '')) as ChatStreamEvent);
    }
  }
}
