import type { AuthContext, DimensionDefinition, MetricDefinition } from './responseSchemas';

export const metricCatalog: MetricDefinition[] = [
  { id: 'revenue', label: 'Revenue', description: 'Total recognized business revenue.', formula: 'sum(revenue)', format: 'currency', grains: ['month', 'country', 'business_unit', 'product'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'channel', 'product_category'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'gross_revenue', label: 'Gross Revenue', description: 'Revenue before discounts, credits, and adjustments.', formula: 'sum(gross_revenue)', format: 'currency', grains: ['month', 'country'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'channel', 'product_category'], sourceTable: 'fact_kpi_snapshot', executable: false },
  { id: 'net_revenue', label: 'Net Revenue', description: 'Revenue after discounts, credits, and adjustments.', formula: 'sum(net_revenue)', format: 'currency', grains: ['month', 'country'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'channel', 'product_category'], sourceTable: 'fact_kpi_snapshot', executable: false },
  { id: 'margin', label: 'Margin', description: 'Profitability percentage after delivery and operating costs.', formula: 'avg(margin_pct)', format: 'percent', grains: ['month', 'country', 'business_unit', 'product'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'product_category'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'units', label: 'Units', description: 'Total delivered or sold units.', formula: 'sum(units)', format: 'number', grains: ['month', 'country', 'business_unit', 'product'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'product_category'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'churn', label: 'Churn', description: 'Share of customers or accounts lost during the selected period.', formula: 'avg(churn_pct)', format: 'percent', grains: ['month', 'country', 'business_unit', 'product'], allowedDimensions: ['date', 'week', 'month', 'region', 'country'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'pricing', label: 'Pricing Deviations', description: 'Count of pricing records outside target bands.', formula: 'sum(pricing_deviations)', format: 'number', grains: ['month', 'country'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'product_category'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'nps', label: 'NPS', description: 'Net promoter score for customer advocacy.', formula: 'avg(nps)', format: 'number', grains: ['month', 'country'], allowedDimensions: ['date', 'week', 'month', 'region', 'country'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'pipeline', label: 'Pipeline', description: 'Current qualified commercial pipeline.', formula: 'sum(pipeline)', format: 'currency', grains: ['month', 'country', 'business_unit'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'channel'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'productivity', label: 'Productivity', description: 'Output efficiency index for delivery teams.', formula: 'avg(productivity)', format: 'percent', grains: ['month', 'country', 'business_unit'], allowedDimensions: ['date', 'week', 'month', 'region', 'country'], sourceTable: 'fact_kpi_snapshot', executable: true },
  { id: 'orders', label: 'Orders', description: 'Total submitted orders.', formula: 'count(order_id)', format: 'number', grains: ['date', 'week', 'month'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'device', 'channel', 'product_category'], sourceTable: 'fact_orders', executable: false },
  { id: 'sessions', label: 'Sessions', description: 'Total digital sessions.', formula: 'count(session_id)', format: 'number', grains: ['date', 'week', 'month'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'device', 'channel'], sourceTable: 'fact_sessions', executable: false },
  { id: 'conversion_rate', label: 'Conversion Rate', description: 'Orders divided by sessions.', formula: 'orders / nullif(sessions, 0)', format: 'percent', grains: ['date', 'week', 'month'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'device', 'channel'], sourceTable: 'semantic_ratio', executable: false },
  { id: 'avg_order_value', label: 'Average Order Value', description: 'Revenue divided by orders.', formula: 'revenue / nullif(orders, 0)', format: 'currency', grains: ['date', 'week', 'month'], allowedDimensions: ['date', 'week', 'month', 'region', 'country', 'device', 'channel', 'product_category'], sourceTable: 'semantic_ratio', executable: false },
];

export const dimensionCatalog: DimensionDefinition[] = [
  { id: 'date', label: 'Date', column: 'period_start', sourceTable: 'fact_kpi_timeseries' },
  { id: 'week', label: 'Week', column: 'period_start', sourceTable: 'fact_kpi_timeseries' },
  { id: 'month', label: 'Month', column: 'period_start', sourceTable: 'fact_kpi_timeseries' },
  { id: 'region', label: 'Region', column: 'region_key', sourceTable: 'dim_country' },
  { id: 'country', label: 'Country', column: 'country_code', sourceTable: 'dim_country' },
  { id: 'device', label: 'Device', column: 'device', sourceTable: 'future_digital_fact' },
  { id: 'channel', label: 'Channel', column: 'channel', sourceTable: 'future_digital_fact' },
  { id: 'product_category', label: 'Product Category', column: 'product_key', sourceTable: 'dim_product' },
];

const metricAliases: Record<string, string[]> = {
  revenue: ['revenue', 'sales'],
  gross_revenue: ['gross revenue', 'gross sales'],
  net_revenue: ['net revenue', 'net sales'],
  margin: ['margin', 'profitability'],
  units: ['units', 'volume'],
  churn: ['churn', 'retention'],
  pricing: ['pricing', 'price deviation', 'pricing deviation'],
  nps: ['nps', 'satisfaction'],
  pipeline: ['pipeline'],
  productivity: ['productivity', 'efficiency'],
  orders: ['orders'],
  sessions: ['sessions', 'traffic'],
  conversion_rate: ['conversion rate', 'conversion'],
  avg_order_value: ['average order value', 'avg order value', 'aov'],
};

const dimensionAliases: Record<string, string[]> = {
  date: ['date', 'day'],
  week: ['week', 'weekly'],
  month: ['month', 'monthly'],
  region: ['region'],
  country: ['country', 'market', 'spain', 'portugal'],
  device: ['device'],
  channel: ['channel'],
  product_category: ['product', 'offering', 'category'],
};

export function resolveMetrics(text: string): MetricDefinition[] {
  const lower = text.toLowerCase();
  return metricCatalog.filter(metric => metricAliases[metric.id]?.some(alias => lower.includes(alias)));
}

export function resolveDimensions(text: string): DimensionDefinition[] {
  const lower = text.toLowerCase();
  return dimensionCatalog.filter(dimension => dimensionAliases[dimension.id]?.some(alias => lower.includes(alias)));
}

export function getMetric(id: string) {
  return metricCatalog.find(metric => metric.id === id);
}

export function getDimension(id: string) {
  return dimensionCatalog.find(dimension => dimension.id === id);
}

export function validateMetricAccess(metricIds: string[], authContext: AuthContext) {
  return metricIds.every(id => authContext.allowedMetricIds.includes(id));
}

export function validateDimensionAccess(dimensionIds: string[], authContext: AuthContext) {
  return dimensionIds.every(id => authContext.allowedDimensionIds.includes(id));
}
