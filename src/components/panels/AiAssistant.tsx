'use client';

import { ChatPanel } from '@/components/chat/ChatPanel';

interface AiAssistantProps {
  compact?: boolean;
}

export function AiAssistant({ compact }: AiAssistantProps = {}) {
  return <ChatPanel compact={compact} />;
}
