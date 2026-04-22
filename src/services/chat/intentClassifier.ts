import type { ChatContext, Intent } from './responseSchemas';
import { isUnsupportedRequest } from './policyEnforcer';
import { resolveDimensions, resolveMetrics } from './semanticResolver';

const breakdownTerms = ['break down', 'breakdown', 'by region', 'by country', 'by market', 'segment', 'top ', 'bottom ', 'last 12 weeks'];
const definitionTerms = ['what does', 'define', 'definition', 'meaning', 'mean?'];
const followUpTerms = ['exclude', 'compare', 'previous', 'instead', 'that', 'those'];

export function classifyIntent(context: ChatContext): Intent {
  const message = context.request.message.toLowerCase();
  if (isUnsupportedRequest(message)) return 'unsupported_request';
  if (definitionTerms.some(term => message.includes(term))) return 'definition_lookup';

  const metrics = resolveMetrics(message);
  const dimensions = resolveDimensions(message);
  const visibleMetricHit = context.request.dashboardState.visibleMetrics.some(metric => message.includes(metric.replace(/_/g, ' ')));
  const isFollowUp = followUpTerms.some(term => message.includes(term)) && Boolean(context.conversation.lastQueryPlan);

  if (message.includes('changed this week') || message.includes('what changed')) {
    return 'answer_from_state';
  }
  if (message.includes('show revenue') && !message.includes('gross') && !message.includes('net')) {
    return 'clarification_required';
  }
  if (metrics.length > 1 && metrics.some(metric => metric.id === 'gross_revenue') && metrics.some(metric => metric.id === 'net_revenue')) {
    return 'clarification_required';
  }
  if (breakdownTerms.some(term => message.includes(term)) || dimensions.length > 0 || isFollowUp) {
    return 'needs_query';
  }
  if (visibleMetricHit || metrics.length > 0 || message.includes('dashboard') || message.includes('kpi') || message.includes('changed this week')) {
    return 'answer_from_state';
  }
  return 'clarification_required';
}
