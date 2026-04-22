import type { ChatAnswer, ChatProgressEvent, ChatRequest, FinalChatPayload, QueryPlan } from '@/types/chat';
import type { ChatContext, Intent, QueryResult, ValidatedResult } from './responseSchemas';
import { assembleChatContext } from './contextAssembler';
import { updateConversation } from './conversationMemory';
import { classifyIntent } from './intentClassifier';
import { buildQueryPlan } from './queryPlanner';
import { runQuery } from './queryExecutor';
import { validateResult } from './resultValidator';
import { buildAnswerInput, getLlmProvider } from './llmClient';
import { getMetric } from './semanticResolver';

const stages: ChatProgressEvent[] = [
  { type: 'status', stage: 'understanding_question', label: 'Understanding question' },
  { type: 'status', stage: 'checking_dashboard_context', label: 'Checking dashboard context' },
  { type: 'status', stage: 'running_query', label: 'Running deterministic query' },
  { type: 'status', stage: 'validating_result', label: 'Validating result' },
  { type: 'status', stage: 'writing_answer', label: 'Writing answer' },
];

export async function handleChat(request: ChatRequest, emit?: (event: ChatProgressEvent | { type: 'token'; token: string }) => void, signal?: AbortSignal): Promise<FinalChatPayload> {
  emit?.(stages[0]);
  const context = await assembleChatContext(request);
  const intent = classifyIntent(context);
  emit?.(stages[1]);

  if (intent === 'unsupported_request') {
    return finalize(context, intent, unsupportedAnswer(context), undefined);
  }
  if (intent === 'clarification_required') {
    return finalize(context, intent, clarificationAnswer(context), undefined);
  }
  if (intent === 'definition_lookup') {
    const result = definitionResult(context);
    emit?.(stages[4]);
    const answer = await explain(context, intent, validateResult(result, result.rows.map(row => String(row.metricId))), emit);
    return finalize(context, intent, answer, undefined);
  }

  let queryPlan = undefined;
  let result: QueryResult = context.dashboardSnapshot;
  if (intent === 'needs_query') {
    emit?.(stages[2]);
    const planned = buildQueryPlan(context);
    if (planned.error || !planned.plan) {
      result = {
        rows: [],
        summary: planned.error || 'The query plan could not be built.',
        source: 'insufficient_data',
        filtersApplied: context.request.dashboardState.filters,
        warnings: [planned.error || 'Query plan unavailable.'],
        citations: [{ type: 'query', label: 'Query plan', value: 'not executed' }],
      };
    } else {
      queryPlan = planned.plan;
      result = await runQuery(planned.plan, context.authContext, signal);
    }
  }

  emit?.(stages[3]);
  const metricIds = queryPlan?.metricIds ?? context.request.dashboardState.visibleMetrics;
  const validated = validateResult(result, metricIds.length ? metricIds : ['revenue']);
  emit?.(stages[4]);
  const answer = await explain(context, intent, validated, emit);
  return finalize(context, intent, answer, queryPlan);
}

async function explain(context: ChatContext, intent: Intent, validated: ValidatedResult, emit?: (event: ChatProgressEvent | { type: 'token'; token: string }) => void): Promise<ChatAnswer> {
  const input = buildAnswerInput({
    question: context.request.message,
    dashboardContext: context.dashboardSnapshot.summary,
    conversationSummary: context.conversation.summary,
    metricDefinitions: context.metricDefinitions,
    validatedResult: validated,
  });

  try {
    const provider = getLlmProvider();
    const structured = await provider.generateStructuredAnswer(input);
    if (emit) streamAnswerText(structured.answer, emit);
    return {
      answer: cleanAnswerText(structured.answer),
      source: validated.source,
      filtersApplied: validated.filtersApplied,
      confidence: structured.confidence || validated.confidence,
      caveats: [...validated.warnings, ...structured.caveats, ...structured.assumptions.map(item => `Assumption: ${item}`)].filter(Boolean),
      followUps: structured.followUps,
      citations: validated.citations,
    };
  } catch {
    return buildDeterministicAnswer(context, intent, validated);
  }
}

function streamAnswerText(answer: string, emit: (event: ChatProgressEvent | { type: 'token'; token: string }) => void) {
  const clean = cleanAnswerText(answer);
  const tokens = clean.split(/(\s+)/).filter(Boolean);
  for (const token of tokens) emit({ type: 'token', token });
}

function cleanAnswerText(answer: string) {
  const trimmed = answer.trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { answer?: string };
    return parsed.answer?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

function buildDeterministicAnswer(context: ChatContext, intent: Intent, validated: ValidatedResult): ChatAnswer {
  const rows = validated.rows.slice(0, 6);
  const line = rows.length
    ? rows.map(row => `${row.label ?? row.name ?? row.period ?? row.metricId}: ${row.formatted ?? row.value ?? row.metric_value ?? 'available'}`).join('; ')
    : validated.summary;
  return {
    answer: `${intent === 'needs_query' ? 'I ran the deterministic query' : 'Using the current dashboard state'}, ${line}.`,
    source: validated.source,
    filtersApplied: validated.filtersApplied,
    confidence: validated.confidence,
    caveats: validated.warnings,
    followUps: ['Break that down by region', 'Compare with the previous period', 'Show the main risks'],
    citations: validated.citations,
  };
}

function definitionResult(context: ChatContext): QueryResult {
  const fallback = getMetric('revenue');
  const rows = context.metricDefinitions.length ? context.metricDefinitions : fallback ? [fallback] : [];
  return {
    rows: rows.map(metric => ({
      metricId: metric.id,
      label: metric.label,
      description: metric.description,
      formula: metric.formula,
      format: metric.format,
    })),
    summary: 'Metric definition lookup.',
    source: 'definition_lookup',
    filtersApplied: context.request.dashboardState.filters,
    warnings: [],
    citations: rows.map(metric => ({ type: 'metric' as const, label: metric.label, value: metric.formula })),
  };
}

function clarificationAnswer(context: ChatContext): ChatAnswer {
  return {
    answer: 'I need one clarification before answering so I do not use the wrong number.',
    source: 'insufficient_data',
    filtersApplied: context.request.dashboardState.filters,
    confidence: 'low',
    caveats: ['The requested metric or period is ambiguous.'],
    followUps: ['Use net revenue', 'Use gross revenue', 'Use the currently visible revenue KPI'],
    clarificationNeeded: true,
    clarificationQuestion: 'Do you mean gross revenue, net revenue, or the currently visible revenue KPI?',
  };
}

function unsupportedAnswer(context: ChatContext): ChatAnswer {
  return {
    answer: 'I cannot help with secrets, raw credentials, unauthorized data, or destructive database actions.',
    source: 'insufficient_data',
    filtersApplied: context.request.dashboardState.filters,
    confidence: 'high',
    caveats: ['The request is outside the assistant policy.'],
    followUps: ['Ask about dashboard KPIs', 'Ask for a metric definition', 'Ask for a permitted breakdown'],
  };
}

function finalize(context: ChatContext, intent: Intent, answer: ChatAnswer, queryPlan?: QueryPlan): FinalChatPayload {
  updateConversation({
    conversationId: context.request.conversationId,
    userMessage: context.request.message,
    assistantAnswer: answer.answer,
    queryPlan,
    filters: answer.filtersApplied,
  });
  return {
    answer,
    debug: process.env.CHAT_DEBUG === 'true'
      ? { intent, queryPlan, usedConversationSummary: Boolean(context.conversation.summary) }
      : undefined,
  };
}
