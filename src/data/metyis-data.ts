/** Generic Metyis Spain Control Tower reference data and mock analytics helpers. */

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

export const KPI_KEYS = ['revenue', 'margin', 'units', 'churn', 'pricing', 'nps', 'pipeline', 'productivity'] as const;
export type KpiKey = typeof KPI_KEYS[number];

export interface KpiMeta {
  key: KpiKey;
  label: string;
  unit: string;
  format: 'currency' | 'percentage' | 'number';
  higherIsBetter: boolean;
  baseValue: number;
  baseTarget: number;
  basePrevious: number;
}

export const KPI_META: Record<KpiKey, KpiMeta> = {
  revenue: { key: 'revenue', label: 'Revenue', unit: 'MEUR', format: 'currency', higherIsBetter: true, baseValue: 1280, baseTarget: 1215, basePrevious: 1128 },
  margin: { key: 'margin', label: 'Margin', unit: '%', format: 'percentage', higherIsBetter: true, baseValue: 28.4, baseTarget: 27.0, basePrevious: 25.8 },
  units: { key: 'units', label: 'Units', unit: 'K', format: 'number', higherIsBetter: true, baseValue: 184, baseTarget: 176, basePrevious: 169 },
  churn: { key: 'churn', label: 'Churn', unit: '%', format: 'percentage', higherIsBetter: false, baseValue: 4.7, baseTarget: 5.0, basePrevious: 5.8 },
  pricing: { key: 'pricing', label: 'Pricing Deviations', unit: '', format: 'number', higherIsBetter: false, baseValue: 428, baseTarget: 390, basePrevious: 512 },
  nps: { key: 'nps', label: 'NPS', unit: 'pts', format: 'number', higherIsBetter: true, baseValue: 52, baseTarget: 48, basePrevious: 45 },
  pipeline: { key: 'pipeline', label: 'Pipeline', unit: 'MEUR', format: 'currency', higherIsBetter: true, baseValue: 940, baseTarget: 900, basePrevious: 835 },
  productivity: { key: 'productivity', label: 'Productivity', unit: '%', format: 'percentage', higherIsBetter: true, baseValue: 82.5, baseTarget: 80.0, basePrevious: 78.4 },
};

export const BUSINESS_UNITS = [
  { key: 'strategy', label: 'Strategy & Transformation', color: '#26547c' },
  { key: 'data-ai', label: 'Data & AI', color: '#06a77d' },
  { key: 'digital', label: 'Digital Commerce', color: '#ef476f' },
  { key: 'operations', label: 'Operations', color: '#ffd166' },
  { key: 'finance', label: 'Finance & Performance', color: '#7b2cbf' },
] as const;

export const PRODUCT_LINES = [
  { key: 'advisory', label: 'Advisory', color: '#2563eb' },
  { key: 'analytics', label: 'Analytics Products', color: '#16a34a' },
  { key: 'managed-services', label: 'Managed Services', color: '#f97316' },
  { key: 'platforms', label: 'Platforms', color: '#9333ea' },
  { key: 'implementation', label: 'Implementation', color: '#dc2626' },
] as const;

export const REGIONS = [
  { key: 'iberia', label: 'Iberia', countries: [{ code: 'ES', name: 'Spain' }, { code: 'PT', name: 'Portugal' }] },
  { key: 'western-europe', label: 'Western Europe', countries: [{ code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' }, { code: 'NL', name: 'Netherlands' }, { code: 'GB', name: 'United Kingdom' }] },
  { key: 'southern-europe', label: 'Southern Europe', countries: [{ code: 'IT', name: 'Italy' }, { code: 'GR', name: 'Greece' }, { code: 'TR', name: 'Turkey' }] },
  { key: 'americas', label: 'Americas', countries: [{ code: 'US', name: 'United States' }, { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' }] },
  { key: 'apac', label: 'APAC', countries: [{ code: 'CN', name: 'China' }, { code: 'IN', name: 'India' }, { code: 'SG', name: 'Singapore' }, { code: 'AU', name: 'Australia' }] },
] as const;

export const ALL_COUNTRIES = REGIONS.flatMap(region => region.countries.map(country => ({ ...country, region: region.key })));

export interface KpiDataPoint {
  key: KpiKey;
  label: string;
  value: number;
  target: number;
  previous: number;
  vsTarget: number;
  vsPrevious: number;
  formatted: string;
  formattedDelta: string;
  isPositive: boolean;
}

function formatValue(meta: KpiMeta, value: number): string {
  if (meta.format === 'currency') return value >= 1000 ? `${(value / 1000).toFixed(1)}B EUR` : `${value.toFixed(0)} MEUR`;
  if (meta.format === 'percentage') return `${value.toFixed(1)}%`;
  if (meta.key === 'units') return `${value.toFixed(0)}K`;
  return value.toFixed(0);
}

export function getKpiPoint(kpiKey: KpiKey, filters: { geo?: string | null; businessUnit?: string | null; product?: string | null; timeframe?: string | null } = {}): KpiDataPoint {
  const meta = KPI_META[kpiKey];
  const seed = hashStr(`${kpiKey}|${filters.geo ?? 'global'}|${filters.businessUnit ?? 'all'}|${filters.product ?? 'all'}|${filters.timeframe ?? '1y'}`);
  const rand = mulberry32(seed);
  const geoFactor = filters.geo ? 0.18 + rand() * 0.35 : 1;
  const buFactor = filters.businessUnit ? 0.25 + rand() * 0.55 : 1;
  const productFactor = filters.product ? 0.35 + rand() * 0.45 : 1;
  const variation = meta.format === 'percentage' ? 0.92 + rand() * 0.16 : 0.88 + rand() * 0.24;
  const scale = meta.format === 'percentage' || meta.key === 'nps' ? variation : geoFactor * buFactor * productFactor * variation;
  const precision = meta.format === 'percentage' ? 1 : 0;
  const value = +(meta.baseValue * scale).toFixed(precision);
  const target = +(meta.baseTarget * (meta.format === 'percentage' || meta.key === 'nps' ? 1 : geoFactor * buFactor * productFactor) * (0.96 + rand() * 0.08)).toFixed(precision);
  const previous = +(meta.basePrevious * (meta.format === 'percentage' || meta.key === 'nps' ? 1 : geoFactor * buFactor * productFactor) * (0.94 + rand() * 0.12)).toFixed(precision);
  const vsTarget = target ? +(((value - target) / target) * 100).toFixed(1) : 0;
  const vsPrevious = previous ? +(((value - previous) / previous) * 100).toFixed(1) : 0;
  const isPositive = meta.higherIsBetter ? vsTarget >= 0 : vsTarget <= 0;
  return { key: kpiKey, label: meta.label, value, target, previous, vsTarget, vsPrevious, formatted: formatValue(meta, value), formattedDelta: `${vsTarget >= 0 ? '+' : ''}${vsTarget.toFixed(1)}% vs target`, isPositive };
}

export function getKpiSnapshot(filters = {}) {
  return KPI_KEYS.map(key => getKpiPoint(key, filters));
}

export function getTimeSeries(kpiKey: KpiKey, filters = {}) {
  const base = getKpiPoint(kpiKey, filters).value;
  const seed = hashStr(`series|${kpiKey}|${JSON.stringify(filters)}`);
  const rand = mulberry32(seed);
  return Array.from({ length: 12 }, (_, index) => {
    const seasonal = Math.sin((index / 12) * Math.PI * 2) * 0.08;
    const noise = (rand() - 0.5) * 0.12;
    const value = +(base * (0.88 + index * 0.018 + seasonal + noise)).toFixed(1);
    return { period: `M${index + 1}`, value, target: +(base * 0.96).toFixed(1) };
  });
}

export function getRanking(kpiKey: KpiKey, filters = {}) {
  return ALL_COUNTRIES.map(country => ({ code: country.code, name: country.name, ...getKpiPoint(kpiKey, { ...filters, geo: country.code }) }))
    .sort((a, b) => KPI_META[kpiKey].higherIsBetter ? b.value - a.value : a.value - b.value)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getMix(kind: 'business-unit' | 'product', filters = {}) {
  const source = kind === 'business-unit' ? BUSINESS_UNITS : PRODUCT_LINES;
  const seed = hashStr(`mix|${kind}|${JSON.stringify(filters)}`);
  const rand = mulberry32(seed);
  const raw = source.map(item => ({ ...item, raw: 0.4 + rand() * 1.6 }));
  const totalRaw = raw.reduce((sum, item) => sum + item.raw, 0);
  return raw.map(item => ({ key: item.key, label: item.label, color: item.color, value: Math.round(1280 * item.raw / totalRaw), pct: +(item.raw / totalRaw * 100).toFixed(1) }));
}

export function getChoropleth(kpiKey: KpiKey, filters = {}) {
  const rows = ALL_COUNTRIES.map(country => ({ ...country, ...getKpiPoint(kpiKey, { ...filters, geo: country.code }) }));
  const scores = rows.map(row => KPI_META[kpiKey].higherIsBetter ? row.vsTarget : -row.vsTarget);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  return rows.map((row, index) => ({ code: row.code, name: row.name, value: (scores[index] - min) / range, formatted: row.formatted, isPositive: row.isPositive }));
}

export function getPricingBreakdown(filters = {}) {
  const point = getKpiPoint('pricing', filters);
  const onPrice = Math.max(45, 72 - point.vsTarget / 2);
  const belowFloor = Math.max(8, 16 + point.vsTarget / 3);
  const aboveCeiling = Math.max(5, 100 - onPrice - belowFloor);
  return [
    { label: 'Below floor', value: +belowFloor.toFixed(1), color: '#dc2626' },
    { label: 'On price', value: +onPrice.toFixed(1), color: '#16a34a' },
    { label: 'Above ceiling', value: +aboveCeiling.toFixed(1), color: '#f59e0b' },
  ];
}

export function getVisualMockData(widgetType: string, params: { kpiKey?: string | null; geo?: string | null; businessUnit?: string | null; product?: string | null; timeframe?: string | null }) {
  const filters = { geo: params.geo, businessUnit: params.businessUnit, product: params.product, timeframe: params.timeframe };
  const typeKpi = (widgetType.replace('kpi-', '') || params.kpiKey || 'revenue') as KpiKey;
  if (widgetType.startsWith('kpi-')) return { kind: 'kpi', data: getKpiPoint(typeKpi, filters), series: getTimeSeries(typeKpi, filters) };
  if (widgetType === 'churn-overview') return { kind: 'churn', churn: getKpiPoint('churn', filters), nps: getKpiPoint('nps', filters) };
  if (widgetType === 'pricing-deviations') return { kind: 'pricing', kpi: getKpiPoint('pricing', filters), breakdown: getPricingBreakdown(filters) };
  if (widgetType === 'performance-map') return { kind: 'map', kpiKey: params.kpiKey || 'revenue', rows: getChoropleth((params.kpiKey || 'revenue') as KpiKey, filters) };
  if (widgetType === 'country-ranking') return { kind: 'ranking', rows: getRanking((params.kpiKey || 'revenue') as KpiKey, filters) };
  if (widgetType === 'business-unit-mix') return { kind: 'mix', rows: getMix('business-unit', filters) };
  if (widgetType === 'product-mix') return { kind: 'mix', rows: getMix('product', filters) };
  if (widgetType === 'trend-line') return { kind: 'series', rows: getTimeSeries((params.kpiKey || 'revenue') as KpiKey, filters) };
  return { kind: 'empty', data: null };
}
