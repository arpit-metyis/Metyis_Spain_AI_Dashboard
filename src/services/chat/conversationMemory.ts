import type { ConversationState, ConversationTurn } from './responseSchemas';
import type { QueryPlan } from '@/types/chat';

const conversations = new Map<string, ConversationState>();
const MAX_RAW_TURNS = 8;

export function getConversation(conversationId: string): ConversationState {
  return conversations.get(conversationId) ?? {
    conversationId,
    summary: '',
    turns: [],
  };
}

export function updateConversation(input: {
  conversationId: string;
  userMessage: string;
  assistantAnswer: string;
  queryPlan?: QueryPlan;
  filters?: Record<string, unknown>;
}) {
  const existing = getConversation(input.conversationId);
  const turns: ConversationTurn[] = [
    ...existing.turns,
    { role: 'user' as const, content: input.userMessage },
    { role: 'assistant' as const, content: input.assistantAnswer },
  ].slice(-MAX_RAW_TURNS);

  conversations.set(input.conversationId, {
    conversationId: input.conversationId,
    summary: summarizeConversation(existing.summary, turns),
    turns,
    lastQueryPlan: input.queryPlan ?? existing.lastQueryPlan,
    lastFilters: input.filters ?? existing.lastFilters,
  });
}

function summarizeConversation(previousSummary: string, turns: ConversationTurn[]) {
  const latest = turns.slice(-4).map(turn => `${turn.role}: ${turn.content}`).join(' | ');
  const combined = [previousSummary, latest].filter(Boolean).join(' | ');
  return combined.length > 900 ? combined.slice(-900) : combined;
}
