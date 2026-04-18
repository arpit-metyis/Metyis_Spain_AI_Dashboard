import type { ScenarioBaseline, ScenarioInput, ScenarioResult, ScenarioRiskLevel, SavedScenario } from '@/lib/data/types';

export const SCENARIO_USER_ID = 'demo-user';

export const timeHorizonOptions = [
  'Current Quarter',
  'Next Quarter',
  'Next 6 Months',
  'Next 12 Months',
  'FY 2026',
];

export const businessUnitOptions = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'digital', label: 'Digital' },
  { value: 'operations', label: 'Operations' },
  { value: 'data-ai', label: 'Data & AI' },
];

export const countryOptions = [
  { value: 'ES', label: 'Spain' },
  { value: 'PT', label: 'Portugal' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'US', label: 'United States' },
  { value: 'TR', label: 'Turkey' },
  { value: 'SG', label: 'Singapore' },
];

export const productOptions = [
  { value: 'advisory', label: 'Advisory' },
  { value: 'analytics', label: 'Analytics Products' },
  { value: 'managed-services', label: 'Managed Services' },
  { value: 'platforms', label: 'Platforms' },
  { value: 'implementation', label: 'Implementation' },
];

export const defaultScenarioInput: ScenarioInput = {
  scenarioName: 'Commercial upside scenario',
  userId: SCENARIO_USER_ID,
  businessUnit: 'strategy',
  country: 'ES',
  product: 'advisory',
  timeHorizon: 'Next Quarter',
  revenueGrowthPct: 4,
  priceChangePct: 1.5,
  unitVolumeChangePct: 2,
  costChangePct: 0.8,
  churnChangePct: -0.4,
  marginTargetPct: 28,
  notes: '',
};

export function createScenarioId() {
  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateScenario(input: ScenarioInput, baseline: ScenarioBaseline): ScenarioResult {
  const revenueFactor = 1 + (input.revenueGrowthPct + input.priceChangePct + input.unitVolumeChangePct) / 100;
  const unitFactor = 1 + input.unitVolumeChangePct / 100;
  const simulatedRevenue = Math.max(0, baseline.revenue * revenueFactor);
  const simulatedUnits = Math.max(0, baseline.units * unitFactor);
  const simulatedChurnPct = clamp(baseline.churnPct + input.churnChangePct, 0, 100);
  const marginTargetGapAdjustment = (input.marginTargetPct - baseline.marginPct) * 0.35;
  const simulatedMarginPct = clamp(
    baseline.marginPct + marginTargetGapAdjustment - input.costChangePct * 0.55 + input.priceChangePct * 0.45,
    -20,
    80,
  );
  const revenueDelta = round(simulatedRevenue - baseline.revenue, 1);
  const marginDelta = round(simulatedMarginPct - baseline.marginPct, 1);
  const riskLevel = getRiskLevel(input, baseline, revenueDelta, marginDelta, simulatedChurnPct);

  return {
    simulatedRevenue: round(simulatedRevenue, 1),
    simulatedMarginPct: round(simulatedMarginPct, 1),
    simulatedUnits: round(simulatedUnits, 0),
    simulatedChurnPct: round(simulatedChurnPct, 1),
    revenueDelta,
    marginDelta,
    riskLevel,
    recommendation: buildRecommendation(riskLevel, input, revenueDelta, marginDelta, simulatedChurnPct),
  };
}

export function buildSavedScenario(input: ScenarioInput, baseline: ScenarioBaseline, result: ScenarioResult): SavedScenario {
  const now = new Date().toISOString();
  const id = input.scenarioId || createScenarioId();
  return {
    id,
    userId: input.userId || SCENARIO_USER_ID,
    name: input.scenarioName,
    createdAt: now,
    updatedAt: now,
    input: { ...input, scenarioId: id, userId: input.userId || SCENARIO_USER_ID },
    baseline,
    result,
  };
}

function getRiskLevel(input: ScenarioInput, baseline: ScenarioBaseline, revenueDelta: number, marginDelta: number, churnPct: number): ScenarioRiskLevel {
  let score = 0;
  if (revenueDelta < 0) score += 2;
  if (marginDelta < 0) score += 2;
  if (input.costChangePct > 4) score += 1;
  if (churnPct > baseline.churnPct + 1) score += 1;
  if (input.marginTargetPct > baseline.marginPct + 8) score += 1;
  if (score >= 4) return 'High';
  if (score >= 2) return 'Medium';
  return 'Low';
}

function buildRecommendation(riskLevel: ScenarioRiskLevel, input: ScenarioInput, revenueDelta: number, marginDelta: number, churnPct: number) {
  if (riskLevel === 'High') {
    return `High-risk scenario: protect margin before scaling. Revisit the ${input.costChangePct.toFixed(1)}% cost assumption and add retention actions because churn lands at ${churnPct.toFixed(1)}%.`;
  }
  if (riskLevel === 'Medium') {
    return `Moderate-risk scenario: upside is plausible, but margin movement is ${marginDelta.toFixed(1)} pts. Validate pricing elasticity and cost controls before rollout.`;
  }
  return `Low-risk scenario: revenue moves by ${revenueDelta >= 0 ? '+' : ''}${revenueDelta.toFixed(1)} MEUR with manageable margin impact. Prioritize execution tracking and early variance monitoring.`;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
