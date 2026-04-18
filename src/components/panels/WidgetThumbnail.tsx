'use client';

import clsx from 'clsx';
import { getWidgetDef } from '@/lib/widget-registry';

export function WidgetThumbnail({ widgetType }: { widgetType: string }) {
  const def = getWidgetDef(widgetType);
  return <div className={clsx('flex h-full w-full items-center justify-center rounded-md border border-[var(--color-stroke-subtle)] bg-[var(--color-bg-elevated)]')}><span className="material-symbols-rounded text-[22px] text-[var(--color-fg-muted)]">{def?.icon ?? 'widgets'}</span></div>;
}
