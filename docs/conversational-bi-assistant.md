# Conversational BI Assistant

The AI Assistant is structured as a production-oriented conversational BI layer. The UI streams questions to `/api/ai/chat`; the API route delegates to services under `src/services/chat` so deterministic data access stays separate from language generation.

## Architecture

1. **UI chat experience**: `components/chat/*` renders the panel, message list, composer, query progress, metadata, caveats, citations, and clarification prompts.
2. **Backend orchestration**: `chatOrchestrator.ts` coordinates context assembly, intent routing, query planning, validation, answer generation, and memory updates.
3. **Semantic metric resolution**: `semanticResolver.ts` owns the metric and dimension catalog. Prompts do not contain executable SQL.
4. **Deterministic query tools**: `queryPlanner.ts`, `queryExecutor.ts`, and `resultValidator.ts` build validated plans, compile trusted parameterized SQL shapes, execute only mapped repository calls, and block unsupported/unauthorized requests.
5. **LLM explanation layer**: `llmClient.ts` exposes a provider adapter. `OpenRouterProvider` is the first implementation; an OpenAI Responses-style provider can be added behind the same interface.

## Runtime Flow

The frontend sends:

- `conversationId`
- `message`
- `dashboardState`
- optional client context such as timezone and locale

The backend emits Server-Sent Events:

- `status`
- `token`
- `final`
- `error`

The final payload includes the answer, source, applied filters, confidence, caveats, follow-ups, and citations. Debug metadata is returned only when `CHAT_DEBUG=true`.

## Environment Variables

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY="<openrouter-api-key>"
OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="Metyis Spain AI Dashboard"
CHAT_DEBUG=false
```

Existing data settings still apply:

```env
DATA_SOURCE=mock
AZURE_SQL_CONNECTION_STRING=""
```

## Swapping Providers

Add a new class implementing `LlmProvider` in `llmClient.ts`:

```ts
export interface LlmProvider {
  classifyIntent(input: unknown): Promise<unknown>;
  generateStructuredAnswer(input: unknown): Promise<unknown>;
  streamAnswer(input: unknown): AsyncIterable<string>;
}
```

Then update `getLlmProvider()` to return the new provider when `LLM_PROVIDER=openai-responses`.

## Safety Rules

- The LLM does not execute SQL.
- Numbers must come from `dashboardState.visibleData`, existing repository calls, or deterministic query results.
- Unsupported metrics and unmapped dimensions return `insufficient_data`.
- Prompt injection text from dashboard metadata is sanitized before it is used as context.
- Tenant and row-level controls are represented through `AuthContext`; the current prototype uses `tenantId=metyis-spain` and `userId=demo-user`.

## Known Limitations

- Conversation memory is in-memory only in this branch.
- Azure SQL execution is mapped only to existing KPI fact-table repository calls.
- Future/demo metrics such as `orders`, `sessions`, and `conversion_rate` exist in the semantic catalog but return insufficient data until mapped to warehouse tables.
- Streaming uses SSE from the Next.js route; a non-streaming compatibility path can be added later if needed.
