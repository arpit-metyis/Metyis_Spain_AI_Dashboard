import clsx from 'clsx';
import { formatDelta } from '@/lib/format';

interface DeltaBadgeProps {
  current: number;
  previous: number;
  invert?: boolean;
}

export function DeltaBadge({ current, previous, invert = false }: DeltaBadgeProps) {
  const delta = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const isPositive = invert ? delta <= 0 : delta >= 0;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        isPositive
          ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
          : 'bg-[var(--color-error)]/15 text-[var(--color-error)]'
      )}
    >
      <span className="text-[10px]">{isPositive ? '\u25B2' : '\u25BC'}</span>
      {formatDelta(current, previous)}
    </span>
  );
}
