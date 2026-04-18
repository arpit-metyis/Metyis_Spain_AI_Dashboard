'use client';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: SearchInputProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-rounded text-[14px] text-[var(--color-fg-subtle)]">
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radii-button)] border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-input)] py-1.5 pl-8 pr-7 text-[12px] text-[var(--color-fg-default)] placeholder-[var(--color-fg-subtle)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-default)] transition-colors"
        >
          <span className="material-symbols-rounded text-[14px]">close</span>
        </button>
      )}
    </div>
  );
}
