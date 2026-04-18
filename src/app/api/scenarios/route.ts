import { NextRequest, NextResponse } from 'next/server';
import { SCENARIO_USER_ID, calculateScenario } from '@/lib/scenario-simulator';
import { withRepositoryFallback } from '@/lib/data/repository';
import type { ScenarioInput } from '@/lib/data/types';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || SCENARIO_USER_ID;
  const scenarios = await withRepositoryFallback(repo => repo.listScenarios(userId));
  return NextResponse.json({ scenarios });
}

export async function POST(request: NextRequest) {
  const input = await request.json() as ScenarioInput;
  const normalizedInput = { ...input, userId: input.userId || SCENARIO_USER_ID };
  const baseline = await withRepositoryFallback(repo => repo.getScenarioBaseline(normalizedInput));
  const result = calculateScenario(normalizedInput, baseline);
  const scenario = await withRepositoryFallback(repo => repo.saveScenario(normalizedInput, baseline, result));
  return NextResponse.json({ scenario });
}

export async function DELETE(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get('scenarioId');
  const userId = request.nextUrl.searchParams.get('userId') || SCENARIO_USER_ID;
  if (!scenarioId) return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
  await withRepositoryFallback(repo => repo.deleteScenario(scenarioId, userId));
  return NextResponse.json({ ok: true });
}
