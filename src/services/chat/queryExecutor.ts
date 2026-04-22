import { withRepositoryFallback } from '@/lib/data/repository';
import type { VisualDataParams } from '@/lib/data/types';
import type { AuthContext, QueryResult } from './responseSchemas';
import type { QueryPlan } from '@/types/chat';
import { getDimension, getMetric } from './semanticResolver';

export async function runQuery(plan: QueryPlan, authContext: AuthContext, signal?: AbortSignal): Promise<QueryResult> {
  if (signal?.aborted) throw new Error('Query cancelled');
  const validationErrors = validateExecutablePlan(plan, authContext);
  if (validationErrors.length > 0) {
    return insufficientData(validationErrors.join(' '), plan);
  }

  const compiled = compileQueryToSql(plan, authContext);
  const metricId = plan.metricIds[0];
  const dimensionId = plan.dimensionIds[0];
  const params: VisualDataParams = {
    widgetType: widgetTypeForPlan(plan),
    kpiKey: metricId,
    geo: filterString(plan.filters.country ?? plan.filters.geo),
    businessUnit: filterString(plan.filters.businessUnit),
    product: filterString(plan.filters.product),
    timeframe: filterString(plan.filters.timeframe) ?? '1y',
  };

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timed out')), 12_000);
  });
  const data = await Promise.race([
    withRepositoryFallback(repo => repo.getVisualData(params)),
    timeout,
  ]);
  const rows = normalizeRepositoryPayload(metricId, dimensionId, data);

  return {
    rows,
    summary: rows.length ? `${rows.length} row(s) returned for ${metricId}${dimensionId ? ` by ${dimensionId}` : ''}.` : 'No rows returned.',
    source: rows.length ? 'warehouse_query' : 'insufficient_data',
    filtersApplied: plan.filters,
    warnings: rows.length ? [] : ['The query returned no rows for the selected filters.'],
    citations: [{ type: 'query', label: 'Deterministic query plan', value: `${plan.analysisType}:${plan.metricIds.join(',')}` }],
    executedQuery: compiled,
  };
}

export function compileQueryToSql(plan: QueryPlan, authContext: AuthContext) {
  const metric = getMetric(plan.metricIds[0]);
  const dimension = plan.dimensionIds[0] ? getDimension(plan.dimensionIds[0]) : undefined;
  if (!metric) throw new Error(`Unknown metric ${plan.metricIds[0]}`);
  const selectDimension = dimension ? `${dimension.column} as dimension_value,` : '';
  const groupBy = dimension ? ` group by ${dimension.column}` : '';
  const orderBy = plan.orderBy ? ' order by metric_value ' + plan.orderBy.direction : '';
  return {
    sql: [
      `select ${selectDimension} ${metric.formula} as metric_value`,
      `from ${metric.sourceTable}`,
      'where tenant_id = @tenant_id',
      'and (@country is null or country_code = @country)',
      'and (@business_unit is null or business_unit_key = @business_unit)',
      'and (@product is null or product_key = @product)',
      groupBy,
      orderBy,
    ].filter(Boolean).join(' '),
    parameters: {
      tenant_id: authContext.tenantId,
      country: plan.filters.country ?? plan.filters.geo ?? null,
      business_unit: plan.filters.businessUnit ?? null,
      product: plan.filters.product ?? null,
    },
  };
}

function validateExecutablePlan(plan: QueryPlan, authContext: AuthContext) {
  const errors: string[] = [];
  for (const metricId of plan.metricIds) {
    const metric = getMetric(metricId);
    if (!metric) errors.push(`Unknown metric ${metricId}.`);
    if (metric && !metric.executable) errors.push(`${metric.label} is not mapped to executable warehouse data yet.`);
    if (!authContext.allowedMetricIds.includes(metricId)) errors.push(`Metric ${metricId} is not authorized.`);
  }
  for (const dimensionId of plan.dimensionIds) {
    const dimension = getDimension(dimensionId);
    if (!dimension) errors.push(`Unknown dimension ${dimensionId}.`);
    if (!authContext.allowedDimensionIds.includes(dimensionId)) errors.push(`Dimension ${dimensionId} is not authorized.`);
  }
  return errors;
}

function widgetTypeForPlan(plan: QueryPlan) {
  if (plan.analysisType === 'trend') return 'trend-line';
  if (plan.dimensionIds.includes('country') || plan.dimensionIds.includes('region')) return 'country-ranking';
  if (plan.dimensionIds.includes('product_category')) return 'product-mix';
  return `kpi-${plan.metricIds[0]}`;
}

function normalizeRepositoryPayload(metricId: string, dimensionId: string | undefined, payload: unknown): Array<Record<string, unknown>> {
  const data = payload as {
    data?: Record<string, unknown>;
    rows?: Array<Record<string, unknown>>;
    series?: Array<Record<string, unknown>>;
  };
  const rows = data.rows ?? data.series ?? (data.data ? [data.data] : []);
  return rows.map(row => ({
    metricId,
    dimensionId,
    ...row,
  }));
}

function insufficientData(summary: string, plan: QueryPlan): QueryResult {
  return {
    rows: [],
    summary,
    source: 'insufficient_data',
    filtersApplied: plan.filters,
    warnings: [summary],
    citations: [{ type: 'query', label: 'Query plan not executed', value: plan.analysisType }],
  };
}

function filterString(value: unknown) {
  if (value === undefined || value === null || value === 'global' || value === 'all') return null;
  return String(value);
}
