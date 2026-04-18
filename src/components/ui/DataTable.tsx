import type { ReactNode } from 'react';
import type { WidgetSize } from '@/types/dashboard';

export interface DataTableRow {
  /** Material Symbols icon name, or custom ReactNode for brand icons */
  icon?: string | ReactNode;
  label: string;
  value: string;
  delta?: 'up' | 'down';
}

interface DataTableProps {
  rows: DataTableRow[];
  size?: WidgetSize;
}

const FONT_SIZE: Record<WidgetSize, number> = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 14,
};

export function DataTable({ rows, size = 'md' }: DataTableProps) {
  const fontSize = FONT_SIZE[size];
  const hideDeltas = size === 'xs';

  return (
    <div className="flex flex-col h-full w-full">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex items-center justify-between flex-1 px-1 ${
            i < rows.length - 1 ? 'border-b border-[var(--color-stroke-subtle)]' : ''
          }`}
        >
          {/* Left: icon + label */}
          <div className="flex items-center gap-2 min-w-0">
            {row.icon != null && (
              typeof row.icon === 'string' ? (
                <span
                  className="material-symbols-rounded text-[16px] shrink-0"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {row.icon}
                </span>
              ) : (
                <span className="shrink-0 flex items-center">{row.icon}</span>
              )
            )}
            <span
              className="truncate"
              style={{ fontSize, color: 'var(--color-fg-default)' }}
            >
              {row.label}
            </span>
          </div>

          {/* Right: delta arrow + value */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {!hideDeltas && row.delta && (
              <span
                className="material-symbols-rounded text-[16px]"
                style={{
                  color: row.delta === 'up'
                    ? 'var(--color-dataviz-positive)'
                    : 'var(--color-dataviz-negative)',
                }}
              >
                {row.delta === 'up' ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            )}
            <span
              className="tabular-nums"
              style={{
                fontSize,
                color: row.delta
                  ? row.delta === 'up'
                    ? 'var(--color-dataviz-positive)'
                    : 'var(--color-dataviz-negative)'
                  : 'var(--color-fg-default)',
              }}
            >
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
