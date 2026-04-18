import { NextRequest, NextResponse } from 'next/server';
import { SCENARIO_USER_ID } from '@/lib/scenario-simulator';
import { withRepositoryFallback } from '@/lib/data/repository';
import type { VisualDataParams } from '@/lib/data/types';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatContext = {
  timeframe?: string;
  geo?: string | null;
  activeKpi?: string;
  businessUnit?: string | null;
  product?: string | null;
};

const CORE_KPIS = ['revenue', 'margin', 'units', 'churn', 'pricing', 'nps', 'pipeline', 'productivity'];
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

export async function POST(request: NextRequest) {
  const { message, messages = [], context = {} } = await request.json() as {
    message?: string;
    messages?: ChatMessage[];
    context?: ChatContext;
  };
  const userMessage = message || messages.filter(item => item.role === 'user').at(-1)?.content;
  if (!userMessage) return NextResponse.json({ error: 'message is required' }, { status: 400 });

  const businessContext = await buildBusinessContext(context);
  const history = messages
    .slice(-8)
    .filter(item => item.role !== 'system')
    .filter((item, index, items) => !(index === items.length - 1 && item.role === 'user' && item.content === userMessage));
  const promptMessages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        'You are the Metyis Spain AI Dashboard assistant.',
        'Answer as a concise business analytics advisor for a consulting/business control tower.',
        'Use only the provided dashboard and scenario context when referencing numbers.',
        'If the context is insufficient, say what is missing and suggest the next analysis step.',
        'Avoid mentioning implementation details, APIs, or model providers unless the user asks.',
      ].join(' '),
    },
    { role: 'system', content: businessContext },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    const reply = await callOpenRouter(promptMessages);
    return NextResponse.json({
      role: 'assistant',
      content: reply.content,
      model: reply.model,
      source: 'openrouter',
    });
  } catch (error) {
    console.warn('OpenRouter chat failed; returning mock response.', error);
    return NextResponse.json({
      role: 'assistant',
      content: buildMockResponse(userMessage),
      source: 'mock',
      isFallback: true,
    });
  }
}

async function callOpenRouter(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const configuredModel = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
  const modelsToTry = configuredModel === DEFAULT_OPENROUTER_MODEL ? [configuredModel] : [configuredModel, DEFAULT_OPENROUTER_MODEL];
  let lastError: unknown;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'Metyis Spain AI Dashboard',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.25,
          max_tokens: 700,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`OpenRouter request failed for ${model}: ${response.status} ${detail}`);
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content) throw new Error(`OpenRouter response for ${model} did not include assistant content`);
      return { content, model: payload?.model || model };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function buildBusinessContext(context: ChatContext) {
  const params: VisualDataParams = {
    widgetType: 'ai-context',
    kpiKey: context.activeKpi || 'revenue',
    geo: context.geo === 'global' ? null : context.geo,
    businessUnit: context.businessUnit,
    product: context.product,
    timeframe: context.timeframe || '1y',
  };

  const [kpis, scenarios] = await Promise.all([
    Promise.all(CORE_KPIS.map(async key => {
      try {
        const payload = await withRepositoryFallback(repo => repo.getVisualData({ ...params, widgetType: `kpi-${key}`, kpiKey: key }));
        return compactKpi(payload);
      } catch {
        return null;
      }
    })),
    withRepositoryFallback(repo => repo.listScenarios(SCENARIO_USER_ID)).catch(() => []),
  ]);

  const kpiLines = kpis.filter(Boolean).map(item => `- ${item}`).join('\n') || '- KPI snapshot unavailable';
  const scenarioLines = scenarios.slice(0, 5).map(scenario => (
    `- ${scenario.name}: ${scenario.input.country}/${scenario.input.businessUnit}/${scenario.input.product}, ${scenario.input.timeHorizon}, revenue ${scenario.result.simulatedRevenue} MEUR (${signed(scenario.result.revenueDelta)} MEUR), margin ${scenario.result.simulatedMarginPct}% (${signed(scenario.result.marginDelta)} pts), risk ${scenario.result.riskLevel}`
  )).join('\n') || '- No saved scenarios available';

  return [
    'Current compact business context:',
    `Filters: timeframe=${context.timeframe || '1y'}, geo=${context.geo || 'global'}, activeKpi=${context.activeKpi || 'revenue'}, businessUnit=${context.businessUnit || 'all'}, product=${context.product || 'all'}.`,
    'Latest KPI snapshot:',
    kpiLines,
    'Top saved scenarios:',
    scenarioLines,
  ].join('\n');
}

function compactKpi(payload: unknown) {
  const data = payload as { data?: { label?: string; formatted?: string; formattedDelta?: string; vsPrevious?: number }; source?: string };
  const point = data.data;
  if (!point?.label || !point?.formatted) return null;
  return `${point.label}: ${point.formatted}, ${point.formattedDelta ?? 'target delta unavailable'}, YoY ${signed(point.vsPrevious ?? 0)}%`;
}

function buildMockResponse(message: string) {
  return [
    'Mock response: OpenRouter is unavailable, so I am using the local fallback.',
    '',
    `For "${message}", review revenue, margin, units, and churn together against the selected market and business-unit context. Prioritize scenarios where revenue growth is positive but margin or churn deteriorates, because those need pricing, delivery-cost, or retention actions before scaling.`,
  ].join('\n');
}

function signed(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`;
}
