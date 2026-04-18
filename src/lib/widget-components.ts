import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { WidgetContentProps } from '@/types/dashboard';
import { KPI_KEYS } from '@/data/metyis-data';

const GenericKpiCard = dynamic(() => import('@/components/widgets/GenericKpiCard'), { ssr: false });
const ChurnOverview = dynamic(() => import('@/components/widgets/ChurnOverview'), { ssr: false });
const PricingDeviations = dynamic(() => import('@/components/widgets/PricingDeviations'), { ssr: false });
const PerformanceMap = dynamic(() => import('@/components/widgets/PerformanceMap'), { ssr: false });
const CountryRanking = dynamic(() => import('@/components/widgets/CountryRanking'), { ssr: false });
const MixTreemap = dynamic(() => import('@/components/widgets/MixTreemap'), { ssr: false });
const TrendLine = dynamic(() => import('@/components/widgets/TrendLine'), { ssr: false });
const SelectorWidget = dynamic(() => import('@/components/widgets/SelectorWidget'), { ssr: false });
const InsightAgent = dynamic(() => import('@/components/widgets/InsightAgent'), { ssr: false });
const ExecutiveSummary = dynamic(() => import('@/components/widgets/ExecutiveSummary'), { ssr: false });
const RiskAlerts = dynamic(() => import('@/components/widgets/RiskAlerts'), { ssr: false });
const TargetAttainment = dynamic(() => import('@/components/widgets/TargetAttainment'), { ssr: false });
const BusinessUnitPerformance = dynamic(() => import('@/components/widgets/BusinessUnitPerformance'), { ssr: false });

const registry: Record<string, ComponentType<WidgetContentProps>> = {
  ...Object.fromEntries(KPI_KEYS.map(k => [`kpi-${k}`, GenericKpiCard])),
  'churn-overview': ChurnOverview,
  'pricing-deviations': PricingDeviations,
  'performance-map': PerformanceMap,
  'country-ranking': CountryRanking,
  'business-unit-mix': MixTreemap,
  'product-mix': MixTreemap,
  'trend-line': TrendLine,
  'executive-summary': ExecutiveSummary,
  'risk-alerts': RiskAlerts,
  'target-attainment': TargetAttainment,
  'business-unit-performance': BusinessUnitPerformance,
  'business-unit-selector': SelectorWidget,
  'product-selector': SelectorWidget,
  'insight-agent': InsightAgent,
};

export function getWidgetComponent(type: string): ComponentType<WidgetContentProps> | null {
  return registry[type] ?? null;
}
