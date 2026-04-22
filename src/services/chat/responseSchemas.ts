import type { ChatAnswer, ChatRequest, DashboardState, FinalChatPayload, QueryPlan } from '@/types/chat';

export type { ChatAnswer, ChatRequest, DashboardState, FinalChatPayload, QueryPlan };

export type Intent =
  | 'answer_from_state'
  | 'needs_query'
  | 'definition_lookup'
  | 'clarification_required'
  | 'unsupported_request';

export type AuthContext = {
  tenantId: 'metyis-spain';
  userId: 'demo-user';
  allowedMetricIds: string[];
  allowedDimensionIds: string[];
};

export type MetricDefinition = {
  id: string;
  label: string;
  description: string;
  formula: string;
  format: 'number' | 'currency' | 'percent';
  grains: string[];
  allowedDimensions: string[];
  sourceTable: string;
  executable: boolean;
};

export type DimensionDefinition = {
  id: string;
  label: string;
  column: string;
  sourceTable: string;
};

export type QueryResult = {
  rows: Array<Record<string, unknown>>;
  summary: string;
  source: 'dashboard_state' | 'warehouse_query' | 'definition_lookup' | 'insufficient_data';
  filtersApplied: Record<string, unknown>;
  warnings: string[];
  citations: ChatAnswer['citations'];
  executedQuery?: {
    sql: string;
    parameters: Record<string, unknown>;
  };
};

export type ValidatedResult = QueryResult & {
  confidence: ChatAnswer['confidence'];
  formats: Record<string, MetricDefinition['format']>;
};

export type LlmAnswerSchema = {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  caveats: string[];
  followUps: string[];
  assumptions: string[];
};

export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ConversationState = {
  conversationId: string;
  summary: string;
  turns: ConversationTurn[];
  lastQueryPlan?: QueryPlan;
  lastFilters?: Record<string, unknown>;
};

export type ChatContext = {
  request: ChatRequest;
  authContext: AuthContext;
  conversation: ConversationState;
  metricDefinitions: MetricDefinition[];
  selectedWidgetText: string;
  dashboardSnapshot: QueryResult;
};
