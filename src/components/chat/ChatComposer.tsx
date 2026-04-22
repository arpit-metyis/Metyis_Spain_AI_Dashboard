'use client';

export function ChatComposer({
  input,
  isSending,
  onInputChange,
  onSend,
}: {
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-input)] px-3 py-2">
        <input
          value={input}
          onChange={event => onInputChange(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && onSend()}
          placeholder="Ask about your data..."
          className="flex-1 bg-transparent text-[13px] text-[var(--color-fg-default)] placeholder-[var(--color-fg-subtle)] outline-none"
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || isSending}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/10 disabled:opacity-30"
          aria-label="Send message"
        >
          <span className="material-symbols-rounded text-[14px]">send</span>
        </button>
      </div>
    </div>
  );
}
