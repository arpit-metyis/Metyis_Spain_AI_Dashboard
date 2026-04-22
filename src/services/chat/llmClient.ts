import type { LlmAnswerSchema, ValidatedResult } from './responseSchemas';

export interface LlmProvider {
  classifyIntent(input: unknown): Promise<unknown>;
  generateStructuredAnswer(input: unknown): Promise<LlmAnswerSchema>;
  streamAnswer(input: unknown): AsyncIterable<string>;
}

type ProviderMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export class OpenRouterProvider implements LlmProvider {
  private apiKey = process.env.OPENROUTER_API_KEY;
  private model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
  private baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  async classifyIntent(input: unknown) {
    return input;
  }

  async generateStructuredAnswer(input: unknown): Promise<LlmAnswerSchema> {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
    const response = await this.request({ messages: buildMessages(input), stream: false });
    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM response did not include content');
    return parseStructuredAnswer(content);
  }

  async *streamAnswer(input: unknown): AsyncIterable<string> {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages: buildMessages(input),
        temperature: 0.15,
        max_tokens: 700,
        stream: true,
      }),
    });
    if (!response.ok || !response.body) throw new Error(`OpenRouter stream failed: ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:') || trimmed === 'data: [DONE]') continue;
        const json = trimmed.replace(/^data:\s*/, '');
        try {
          const payload = JSON.parse(json);
          const token = payload?.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch {
          // Ignore malformed provider chunks and continue the stream.
        }
      }
    }
  }

  private async request({ messages, stream }: { messages: ProviderMessage[]; stream: boolean }) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.15,
        max_tokens: 700,
        stream,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status} ${await response.text()}`);
    return response.json();
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Metyis Spain AI Dashboard',
    };
  }
}

export function getLlmProvider(): LlmProvider {
  return new OpenRouterProvider();
}

export function buildAnswerInput(input: {
  question: string;
  dashboardContext: string;
  conversationSummary: string;
  metricDefinitions: unknown;
  validatedResult: ValidatedResult;
}) {
  return input;
}

function buildMessages(input: unknown): ProviderMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You are a production conversational BI assistant for Metyis Spain dashboards.',
        'Use only provided data. Do not invent metrics or numbers.',
        'If evidence is insufficient, say so clearly.',
        'If a diagnostic claim is uncertain, phrase it as a hypothesis.',
        'Keep the answer concise and explainable.',
        'Return strict JSON with answer, confidence, caveats, followUps, and assumptions.',
      ].join(' '),
    },
    { role: 'user', content: JSON.stringify(input) },
  ];
}

function parseStructuredAnswer(content: string): LlmAnswerSchema {
  const normalized = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(normalized) as Partial<LlmAnswerSchema>;
    return {
      answer: parsed.answer || normalized,
      confidence: parsed.confidence || 'medium',
      caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
    };
  } catch {
    return parseLabeledPlainText(normalized);
  }
}

function parseLabeledPlainText(content: string): LlmAnswerSchema {
  const confidence = content.match(/confidence:\s*(high|medium|low)/i)?.[1]?.toLowerCase() as LlmAnswerSchema['confidence'] | undefined;
  const answer = content
    .replace(/confidence:\s*(high|medium|low)/ig, '')
    .replace(/caveats?:\s*/ig, '\nCaveat: ')
    .replace(/follow-?ups?:\s*/ig, '\nFollow-up: ')
    .replace(/assumptions?:\s*/ig, '\nAssumption: ')
    .trim();
  return {
    answer,
    confidence: confidence || 'medium',
    caveats: collectLabeled(content, 'caveats?'),
    followUps: collectLabeled(content, 'follow-?ups?'),
    assumptions: collectLabeled(content, 'assumptions?'),
  };
}

function collectLabeled(content: string, label: string) {
  const match = content.match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i'));
  if (!match?.[1]) return [];
  return match[1].split(/[.;]\s*/).map(item => item.trim()).filter(Boolean);
}
