import type { DashboardTab } from '@/types/dashboard';
import { getVisualMockData } from '@/data/metyis-data';
import { buildSavedScenario } from '@/lib/scenario-simulator';
import type { DashboardRepository, SavedScenario, ScenarioBaseline, ScenarioInput, ScenarioResult, VisualDataParams } from './types';

const layoutStore = new Map<string, { tabs: DashboardTab[]; updatedAt: string }>();
const scenarioStore = new Map<string, SavedScenario>();

const baselineByCountry: Record<string, ScenarioBaseline> = {
  ES: { revenue: 315, marginPct: 27.8, units: 48, churnPct: 4.2 },
  PT: { revenue: 178, marginPct: 25.4, units: 29, churnPct: 4.8 },
  FR: { revenue: 246, marginPct: 26.1, units: 36, churnPct: 4.6 },
  DE: { revenue: 281, marginPct: 28.3, units: 42, churnPct: 3.9 },
  NL: { revenue: 169, marginPct: 29.1, units: 24, churnPct: 3.7 },
  US: { revenue: 205, marginPct: 30.2, units: 33, churnPct: 3.5 },
  TR: { revenue: 196, marginPct: 24.9, units: 41, churnPct: 5.3 },
  SG: { revenue: 187, marginPct: 31.4, units: 21, churnPct: 3.2 },
};

export class MockDashboardRepository implements DashboardRepository {
  async getVisualData(params: VisualDataParams): Promise<unknown> {
    return { source: 'mock', ...getVisualMockData(params.widgetType, params) };
  }

  async getDashboardLayout(dashboardId: string): Promise<{ tabs: DashboardTab[]; updatedAt?: string } | null> {
    return layoutStore.get(dashboardId) ?? null;
  }

  async saveDashboardLayout(dashboardId: string, tabs: DashboardTab[]): Promise<void> {
    layoutStore.set(dashboardId, { tabs, updatedAt: new Date().toISOString() });
  }

  async getScenarioBaseline(input: ScenarioInput): Promise<ScenarioBaseline> {
    const base = baselineByCountry[input.country] ?? baselineByCountry.ES;
    const businessUnitLift = input.businessUnit === 'data-ai' ? 1.12 : input.businessUnit === 'operations' ? 0.92 : 1;
    const productLift = input.product === 'analytics' ? 1.16 : input.product === 'managed-services' ? 1.08 : input.product === 'platforms' ? 0.92 : 1;
    return {
      revenue: Math.round(base.revenue * businessUnitLift * productLift * 10) / 10,
      marginPct: Math.round((base.marginPct + (productLift - 1) * 8) * 10) / 10,
      units: Math.round(base.units * businessUnitLift),
      churnPct: base.churnPct,
    };
  }

  async listScenarios(userId: string): Promise<SavedScenario[]> {
    return [...scenarioStore.values()]
      .filter(scenario => scenario.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveScenario(input: ScenarioInput, baseline: ScenarioBaseline, result: ScenarioResult): Promise<SavedScenario> {
    const existing = input.scenarioId ? scenarioStore.get(input.scenarioId) : null;
    const saved = buildSavedScenario(input, baseline, result);
    scenarioStore.set(saved.id, {
      ...saved,
      createdAt: existing?.createdAt ?? saved.createdAt,
      updatedAt: new Date().toISOString(),
    });
    return scenarioStore.get(saved.id)!;
  }

  async deleteScenario(scenarioId: string, userId: string): Promise<void> {
    const scenario = scenarioStore.get(scenarioId);
    if (scenario?.userId === userId) scenarioStore.delete(scenarioId);
  }

  async getHealth() {
    return { source: 'mock', ok: true, detail: 'Using deterministic mock data fallback' };
  }
}
