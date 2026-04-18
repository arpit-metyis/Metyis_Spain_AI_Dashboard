import type { DashboardTab } from '@/types/dashboard';

export interface VisualDataParams {
  widgetType: string;
  kpiKey?: string | null;
  geo?: string | null;
  businessUnit?: string | null;
  product?: string | null;
  timeframe?: string | null;
}

export type ScenarioRiskLevel = 'Low' | 'Medium' | 'High';

export interface ScenarioInput {
  scenarioId?: string;
  scenarioName: string;
  userId?: string;
  businessUnit: string;
  country: string;
  product: string;
  timeHorizon: string;
  revenueGrowthPct: number;
  priceChangePct: number;
  unitVolumeChangePct: number;
  costChangePct: number;
  churnChangePct: number;
  marginTargetPct: number;
  notes?: string;
}

export interface ScenarioBaseline {
  revenue: number;
  marginPct: number;
  units: number;
  churnPct: number;
}

export interface ScenarioResult {
  simulatedRevenue: number;
  simulatedMarginPct: number;
  simulatedUnits: number;
  simulatedChurnPct: number;
  revenueDelta: number;
  marginDelta: number;
  riskLevel: ScenarioRiskLevel;
  recommendation: string;
}

export interface SavedScenario {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  input: ScenarioInput;
  baseline: ScenarioBaseline;
  result: ScenarioResult;
}

export interface DashboardRepository {
  getVisualData(params: VisualDataParams): Promise<unknown>;
  getDashboardLayout(dashboardId: string): Promise<{ tabs: DashboardTab[]; updatedAt?: string } | null>;
  saveDashboardLayout(dashboardId: string, tabs: DashboardTab[]): Promise<void>;
  getScenarioBaseline(input: ScenarioInput): Promise<ScenarioBaseline>;
  listScenarios(userId: string): Promise<SavedScenario[]>;
  saveScenario(input: ScenarioInput, baseline: ScenarioBaseline, result: ScenarioResult): Promise<SavedScenario>;
  deleteScenario(scenarioId: string, userId: string): Promise<void>;
  getHealth(): Promise<{ source: string; ok: boolean; detail?: unknown }>;
}
