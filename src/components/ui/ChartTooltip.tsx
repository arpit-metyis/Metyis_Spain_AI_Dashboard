import { formatNumber, formatCurrency, formatPercentage } from '@/lib/format';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  formatter?: 'number' | 'currency' | 'percentage';
  suffix?: string;
}

export function ChartTooltip({ active, payload, label, formatter = 'number', suffix }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const format = (v: number) => {
    switch (formatter) {
      case 'currency': return formatCurrency(v);
      case 'percentage': return formatPercentage(v);
      default: return formatNumber(v);
    }
  };

  return (
    <div className="rounded-[var(--radii-widget)] border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-tooltip)] px-3 py-2 shadow-[var(--shadow-elevated)]">
      {label && (
        <p className="mb-1.5 text-[11px] font-medium text-[var(--color-fg-muted)]">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[var(--color-fg-muted)]">{entry.name}</span>
            <span className="ml-auto font-medium text-[var(--color-fg-default)]">{format(entry.value)}{suffix ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
