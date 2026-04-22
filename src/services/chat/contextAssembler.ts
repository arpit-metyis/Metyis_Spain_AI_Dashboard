import { SCENARIO_USER_ID } from '@/lib/scenario-simulator';
import { withRepositoryFallback } from '@/lib/data/repository';
import type { VisualDataParams } from '@/lib/data/types';
import type { ChatContext, QueryResult } from './responseSchemas';
import type { ChatRequest } from '@/types/chat';
import { getConversation } from './conversationMemory';
import { defaultAuthContext, sanitizeUntrustedText } from './policyEnforcer';
import { metricCatalog } from './semanticResolver';

const DEFAULT_METRICS = ['revenue', 'margin', 'units', 'churn', 'pricing', 'nps', 'pipeline', 'productivity'];

export async function assembleChatContext(request: ChatRequest): Promise<ChatContext> {
  const metricIds = request.dashboardState.visibleMetrics.length ? request.dashboardState.visibleMetrics : DEFAULT_METRICS;
  const snapshot = await buildDashboardSnapshot(request, metricIds);
  const metricDefinitions = metricCatalog.filter(metric => metricIds.includes(metric.id) || request.message.toLowerCase().includes(metric.label.toLowerCase()));
  const widgetMeta = request.dashboardState.widgetMeta;

  return {
    request: {
      ...request,
      message: sanitizeUntrustedText(request.message),
    },
    authContext: defaultAuthContext,
    conversation: getConversation(request.conversationId),
    metricDefinitions,
    selectedWidgetText: sanitizeUntrustedText([widgetMeta?.title, widgetMeta?.chartType, widgetMeta?.xAxis, widgetMeta?.yAxis?.join(', ')].filter(Boolean).join(' | ')),
    dashboardSnapshot: snapshot,
  };
}

async function buildDashboardSnapshot(request: ChatRequest, metricIds: string[]): Promise<QueryResult> {
  const filters = request.dashboardState.filters;
  const params: Omit<VisualDataParams, 'widgetType' | 'kpiKey'> = {
    geo: normalizeFilter(filters.geo),
    businessUnit: normalizeFilter(filters.businessUnit),
    product: normalizeFilter(filters.product),
    timeframe: normalizeFilter(filters.timeframe) ?? '1y',
  };

  const rows: Array<Record<string, unknown> | null> = await Promise.all(metricIds.slice(0, 10).map(async metricId => {
    if (request.dashboardState.visibleData?.[metricId]) {
      return { metricId, source: 'browser_visible_data', value: request.dashboardState.visibleData[metricId] };
    }
    try {
      const payload = await withRepositoryFallback(repo => repo.getVisualData({ ...params, widgetType: `kpi-${metricId}`, kpiKey: metricId }));
      return compactVisualPayload(metricId, payload);
    } catch {
      return null;
    }
  }));

  const scenarios = await withRepositoryFallback(repo => repo.listScenarios(SCENARIO_USER_ID)).catch(() => []);
  return {
    rows: rows.filter(isRecord),
    summary: [
      `Dashboard ${request.dashboardState.dashboardId}/${request.dashboardState.pageId}`,
      `Visible metrics: ${metricIds.join(', ')}`,
      `Saved scenarios available: ${scenarios.length}`,
    ].join('. '),
    source: 'dashboard_state',
    filtersApplied: filters,
    warnings: rows.some(row => row === null) ? ['Some visible metric snapshots were unavailable.'] : [],
    citations: [{ type: 'dashboard', label: 'Dashboard state', value: request.dashboardState.dashboardId }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compactVisualPayload(metricId: string, payload: unknown) {
  const data = payload as { source?: string; data?: Record<string, unknown>; series?: unknown[] };
  const point = data.data ?? {};
  return {
    metricId,
    source: data.source ?? 'repository',
    label: point.label,
    value: point.value,
    formatted: point.formatted,
    target: point.target,
    vsTarget: point.vsTarget,
    vsPrevious: point.vsPrevious,
  };
}

function normalizeFilter(value: unknown) {
  if (value === undefined || value === null || value === 'global' || value === 'all') return null;
  return String(value);
}
