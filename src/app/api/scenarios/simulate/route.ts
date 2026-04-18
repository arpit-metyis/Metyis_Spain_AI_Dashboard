import { NextRequest, NextResponse } from 'next/server';
import { SCENARIO_USER_ID, calculateScenario } from '@/lib/scenario-simulator';
import { withRepositoryFallback } from '@/lib/data/repository';
import type { ScenarioInput } from '@/lib/data/types';

export async function POST(request: NextRequest) {
  const input = await request.json() as ScenarioInput;
  const normalizedInput = { ...input, userId: input.userId || SCENARIO_USER_ID };
  const baseline = await withRepositoryFallback(repo => repo.getScenarioBaseline(normalizedInput));
  const result = calculateScenario(normalizedInput, baseline);
  return NextResponse.json({ baseline, result });
}
