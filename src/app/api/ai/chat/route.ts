import { NextRequest, NextResponse } from 'next/server';
import type { ChatRequest, ChatStreamEvent } from '@/types/chat';
import { handleChat } from '@/services/chat/chatOrchestrator';

export async function POST(request: NextRequest) {
  const body = await request.json() as ChatRequest;
  const validationError = validateRequest(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(`event: ${event.type}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const payload = await handleChat(body, emit, request.signal);
        emit({ type: 'final', payload });
      } catch (error) {
        emit({ type: 'error', error: error instanceof Error ? error.message : 'Chat request failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function validateRequest(body: ChatRequest) {
  if (!body?.conversationId) return 'conversationId is required';
  if (!body?.message?.trim()) return 'message is required';
  if (!body.dashboardState?.dashboardId) return 'dashboardState.dashboardId is required';
  if (!body.dashboardState?.pageId) return 'dashboardState.pageId is required';
  return null;
}
