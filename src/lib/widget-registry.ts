import type { WidgetDefinition } from '@/types/dashboard';
import { KPI_KEYS, KPI_META } from '@/data/metyis-data';

function kpiDef(key: string): WidgetDefinition {
  const meta = KPI_META[key as keyof typeof KPI_META];
  return {
    type: `kpi-${key}`,
    name: meta?.label ?? key,
    description: `${meta?.label ?? key} performance against target`,
    category: 'kpis',
    icon: key === 'revenue' ? 'payments' : key === 'margin' ? 'percent' : key === 'units' ? 'inventory_2' : key === 'churn' ? 'person_remove' : key === 'pricing' ? 'price_change' : 'monitoring',
    minW: 2, maxW: 8, minH: 2, maxH: 5, defaultW: 4, defaultH: 2,
    supportedFilters: ['timeframe'],
  };
}

export const widgetRegistry: Record<string, WidgetDefinition> = {
  ...Object.fromEntries(KPI_KEYS.map(k => [`kpi-${k}`, kpiDef(k)])),
  'churn-overview': { type: 'churn-overview', name: 'Churn Overview', description: 'Churn and satisfaction risk view', category: 'kpis', icon: 'person_remove', minW: 4, maxW: 10, minH: 2, maxH: 5, defaultW: 6, defaultH: 2, supportedFilters: ['timeframe'] },
  'pricing-deviations': { type: 'pricing-deviations', name: 'Pricing Deviations', description: 'Below floor, on price, and above ceiling split', category: 'charts', icon: 'price_change', minW: 4, maxW: 10, minH: 2, maxH: 5, defaultW: 6, defaultH: 2, supportedFilters: ['timeframe'] },
  'performance-map': { type: 'performance-map', name: 'Performance Map', description: 'Market performance by selected KPI', category: 'charts', icon: 'public', minW: 6, maxW: 24, minH: 4, maxH: 12, defaultW: 12, defaultH: 7, supportedFilters: ['timeframe'] },
  'country-ranking': { type: 'country-ranking', name: 'Market Ranking', description: 'Countries ranked by selected KPI', category: 'tables', icon: 'leaderboard', minW: 5, maxW: 14, minH: 4, maxH: 12, defaultW: 10, defaultH: 7, supportedFilters: ['timeframe'] },
  'business-unit-mix': { type: 'business-unit-mix', name: 'Business Unit Mix', description: 'Revenue contribution by business unit', category: 'charts', icon: 'account_tree', minW: 4, maxW: 12, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: ['timeframe'] },
  'product-mix': { type: 'product-mix', name: 'Offering Mix', description: 'Revenue contribution by offering', category: 'charts', icon: 'category', minW: 4, maxW: 12, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: ['timeframe'] },
  'trend-line': { type: 'trend-line', name: 'KPI Trend', description: 'Selected KPI trend against target', category: 'charts', icon: 'show_chart', minW: 6, maxW: 16, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: ['timeframe'] },
  'executive-summary': { type: 'executive-summary', name: 'Executive Summary', description: 'All key metrics in one compact view', category: 'kpis', icon: 'dashboard', minW: 6, maxW: 16, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: ['timeframe'] },
  'target-attainment': { type: 'target-attainment', name: 'Target Attainment', description: 'KPI achievement against targets', category: 'charts', icon: 'track_changes', minW: 5, maxW: 14, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: ['timeframe'] },
  'risk-alerts': { type: 'risk-alerts', name: 'Risk Alerts', description: 'KPIs currently below target', category: 'tables', icon: 'warning', minW: 4, maxW: 12, minH: 3, maxH: 8, defaultW: 6, defaultH: 4, supportedFilters: ['timeframe'] },
  'business-unit-performance': { type: 'business-unit-performance', name: 'Business Unit Performance', description: 'Selected KPI by business unit', category: 'charts', icon: 'stacked_bar_chart', minW: 5, maxW: 14, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: ['timeframe'] },
  'business-unit-selector': { type: 'business-unit-selector', name: 'Business Unit Selector', description: 'Set active business unit context', category: 'filters', icon: 'account_tree', minW: 4, maxW: 10, minH: 2, maxH: 6, defaultW: 6, defaultH: 3, supportedFilters: [] },
  'product-selector': { type: 'product-selector', name: 'Offering Selector', description: 'Set active offering context', category: 'filters', icon: 'category', minW: 4, maxW: 10, minH: 2, maxH: 6, defaultW: 6, defaultH: 3, supportedFilters: [] },
  'insight-agent': { type: 'insight-agent', name: 'Insight Agent', description: 'AI analysis prompt for the current dashboard', category: 'ai-agents', icon: 'auto_awesome', minW: 6, maxW: 16, minH: 3, maxH: 8, defaultW: 8, defaultH: 4, supportedFilters: [] },
};

export const widgetCategories = [
  { id: 'kpis' as const, name: 'KPIs', description: 'Executive metrics' },
  { id: 'charts' as const, name: 'Charts', description: 'Visual analytics' },
  { id: 'tables' as const, name: 'Tables', description: 'Detailed records' },
  { id: 'filters' as const, name: 'Selectors', description: 'Dashboard controls' },
];

export function getWidgetsByCategory() {
  const grouped: Record<string, WidgetDefinition[]> = {};
  for (const widget of Object.values(widgetRegistry)) {
    if (widget.category === 'ai-agents') continue;
    if (!grouped[widget.category]) grouped[widget.category] = [];
    grouped[widget.category].push(widget);
  }
  return grouped;
}

export function getAgentEntries(): WidgetDefinition[] {
  return Object.values(widgetRegistry).filter(w => w.category === 'ai-agents');
}

export function getWidgetDef(type: string): WidgetDefinition | undefined {
  return widgetRegistry[type];
}
