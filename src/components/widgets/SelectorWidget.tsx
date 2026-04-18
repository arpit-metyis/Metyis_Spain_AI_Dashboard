'use client';

import type { WidgetContentProps } from '@/types/dashboard';
import { BUSINESS_UNITS, PRODUCT_LINES } from '@/data/metyis-data';
import { useSelection } from '@/stores/selection-store';

export default function SelectorWidget({ definition }: WidgetContentProps) {
  const { activeBusinessUnit, setActiveBusinessUnit, activeProduct, setActiveProduct } = useSelection();
  const isProduct = definition.type === 'product-selector';
  const rows = isProduct ? PRODUCT_LINES : BUSINESS_UNITS;
  const active = isProduct ? activeProduct : activeBusinessUnit;
  const setActive = isProduct ? setActiveProduct : setActiveBusinessUnit;
  return <div className="grid h-full w-full grid-cols-1 gap-1 overflow-auto">{rows.map(row => <button key={row.key} onClick={() => setActive(active === row.key ? null : row.key)} className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--color-bg-elevated)]" style={{ color: active === row.key ? 'var(--color-accent)' : 'var(--color-fg-default)' }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} /><span className="truncate">{row.label}</span></button>)}</div>;
}
