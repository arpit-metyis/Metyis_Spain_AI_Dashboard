export type DashboardState = {
  dashboardId: string;
  pageId: string;
  widgetId?: string;
  filters: Record<string, unknown>;
  visibleMetrics: string[];
  visibleDimensions: string[];
  widgetMeta?: {
    title?: string;
    chartType?: string;
    xAxis?: string;
    yAxis?: string[];
  };
  visibleData?: Record<string, unknown>;
};

export type ChatRequest = {
  conversationId: string;
  message: string;
  dashboardState: DashboardState;
  clientContext?: {
    timezone?: string;
    locale?: string;
  };
};

export type ChatAnswer = {
  answer: string;
  source: 'dashboard_state' | 'warehouse_query' | 'definition_lookup' | 'insufficient_data';
  filtersApplied: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  caveats: string[];
  followUps: string[];
  citations?: Array<{
    type: 'metric' | 'query' | 'dashboard';
    label: string;
    value: string;
  }>;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
};

export type ChatProgressStage =
  | 'understanding_question'
  | 'checking_dashboard_context'
  | 'running_query'
  | 'validating_result'
  | 'writing_answer';

export type ChatProgressEvent = {
  type: 'status';
  stage: ChatProgressStage;
  label: string;
};

export type ChatTokenEvent = {
  type: 'token';
  token: string;
};

export type FinalChatPayload = {
  answer: ChatAnswer;
  debug?: {
    intent: string;
    queryPlan?: QueryPlan;
    usedConversationSummary?: boolean;
  };
};

export type ChatFinalEvent = {
  type: 'final';
  payload: FinalChatPayload;
};

export type ChatErrorEvent = {
  type: 'error';
  error: string;
};

export type ChatStreamEvent = ChatProgressEvent | ChatTokenEvent | ChatFinalEvent | ChatErrorEvent;

export type QueryPlan = {
  metricIds: string[];
  dimensionIds: string[];
  timeRange?: {
    from: string;
    to: string;
    compareTo?: {
      from: string;
      to: string;
    };
  };
  filters: Record<string, unknown>;
  limit?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  analysisType: 'trend' | 'breakdown' | 'comparison' | 'top_n' | 'distribution';
};
