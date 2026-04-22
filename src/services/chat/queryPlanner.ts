import type { ChatContext, QueryPlan } from './responseSchemas';
import { enforcePlanPolicy } from './policyEnforcer';
import { getDimension, getMetric, resolveDimensions, resolveMetrics } from './semanticResolver';

export function buildQueryPlan(context: ChatContext): { plan?: QueryPlan; error?: string } {
  const message = context.request.message.toLowerCase();
  const previous = context.conversation.lastQueryPlan;
  const metrics = resolveMetrics(message);
  const dimensions = resolveDimensions(message);
  const metricIds = metrics.length ? metrics.map(metric => metric.id) : previous?.metricIds ?? [context.request.dashboardState.visibleMetrics[0] ?? 'revenue'];
  const dimensionIds = dimensions.length ? dimensions.map(dimension => dimension.id) : inferDimensions(message, previous?.dimensionIds);
  const filters = applyFollowUpFilters(message, { ...context.request.dashboardState.filters }, previous?.filters);
  const analysisType = inferAnalysisType(message, dimensionIds);
  const plan: QueryPlan = {
    metricIds: Array.from(new Set(metricIds)),
    dimensionIds: Array.from(new Set(dimensionIds)),
    filters,
    limit: message.includes('top') ? 10 : undefined,
    orderBy: message.includes('top') ? { field: metricIds[0] ?? 'revenue', direction: 'desc' } : undefined,
    analysisType,
  };

  const policyError = enforcePlanPolicy(plan.metricIds, plan.dimensionIds, context.authContext);
  if (policyError) return { error: policyError };

  const unavailable = plan.metricIds.map(getMetric).filter(metric => metric && !metric.executable);
  if (unavailable.length > 0) {
    return { error: `${unavailable.map(metric => metric?.label).join(', ')} is defined in the catalog but not mapped to the current Azure SQL fact tables yet.` };
  }
  const unsupportedDimensions = plan.dimensionIds.map(getDimension).filter(dimension => dimension?.sourceTable === 'future_digital_fact');
  if (unsupportedDimensions.length > 0) {
    return { error: `${unsupportedDimensions.map(dimension => dimension?.label).join(', ')} is not available in the current warehouse mapping.` };
  }
  return { plan };
}

export function validateQueryPlan(plan: QueryPlan) {
  const metricErrors = plan.metricIds.filter(id => !getMetric(id));
  const dimensionErrors = plan.dimensionIds.filter(id => !getDimension(id));
  return [...metricErrors.map(id => `Unknown metric: ${id}`), ...dimensionErrors.map(id => `Unknown dimension: ${id}`)];
}

function inferDimensions(message: string, previous?: string[]) {
  if (message.includes('region')) return ['region'];
  if (message.includes('country') || message.includes('market')) return ['country'];
  if (message.includes('month')) return ['month'];
  if (message.includes('week')) return ['week'];
  if (message.includes('product') || message.includes('offering')) return ['product_category'];
  return previous ?? [];
}

function inferAnalysisType(message: string, dimensions: string[]): QueryPlan['analysisType'] {
  if (message.includes('compare')) return 'comparison';
  if (message.includes('trend') || message.includes('week') || message.includes('month')) return 'trend';
  if (message.includes('top')) return 'top_n';
  if (dimensions.length > 0) return 'breakdown';
  return 'comparison';
}

function applyFollowUpFilters(message: string, current: Record<string, unknown>, previous?: Record<string, unknown>) {
  const filters = { ...(previous ?? {}), ...current };
  if (message.includes('exclude spain')) filters.excludeCountry = 'ES';
  if (message.includes('spain') && !message.includes('exclude')) filters.country = 'ES';
  if (message.includes('portugal')) filters.country = 'PT';
  return filters;
}
