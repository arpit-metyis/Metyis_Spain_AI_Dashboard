import type { AuthContext } from './responseSchemas';
import { metricCatalog, dimensionCatalog, getDimension, getMetric, validateDimensionAccess, validateMetricAccess } from './semanticResolver';

export const defaultAuthContext: AuthContext = {
  tenantId: 'metyis-spain',
  userId: 'demo-user',
  allowedMetricIds: metricCatalog.filter(metric => metric.executable || ['orders', 'sessions', 'conversion_rate', 'avg_order_value', 'gross_revenue', 'net_revenue'].includes(metric.id)).map(metric => metric.id),
  allowedDimensionIds: dimensionCatalog.map(dimension => dimension.id).filter(id => id !== 'device'),
};

const piiPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g,
];

export function redactPii(text: string) {
  return piiPatterns.reduce((value, pattern) => value.replace(pattern, '[redacted]'), text);
}

export function sanitizeUntrustedText(text: string | undefined) {
  if (!text) return '';
  return redactPii(text)
    .replace(/ignore (all )?(previous|above) instructions/gi, '[instruction removed]')
    .replace(/system prompt/gi, '[system reference removed]')
    .slice(0, 1200);
}

export function enforcePlanPolicy(metricIds: string[], dimensionIds: string[], authContext: AuthContext) {
  if (!validateMetricAccess(metricIds, authContext)) {
    const denied = metricIds.filter(id => !authContext.allowedMetricIds.includes(id)).map(id => getMetric(id)?.label ?? id);
    return `You are not authorized to access requested metrics: ${denied.join(', ')}.`;
  }
  if (!validateDimensionAccess(dimensionIds, authContext)) {
    const denied = dimensionIds.filter(id => !authContext.allowedDimensionIds.includes(id)).map(id => getDimension(id)?.label ?? id);
    return `You are not authorized to access requested dimensions: ${denied.join(', ')}.`;
  }
  return null;
}

export function isUnsupportedRequest(message: string) {
  const lower = message.toLowerCase();
  return ['password', 'secret', 'api key', 'delete database', 'raw sql', 'connection string'].some(term => lower.includes(term));
}
