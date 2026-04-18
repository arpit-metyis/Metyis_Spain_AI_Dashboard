'use client';

import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { WidgetContentProps } from '@/types/dashboard';
import { useVisualData } from '@/lib/hooks/use-visual-data';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const NUMERIC_TO_A2: Record<string, string> = { '724': 'ES', '620': 'PT', '250': 'FR', '276': 'DE', '528': 'NL', '826': 'GB', '380': 'IT', '300': 'GR', '792': 'TR', '840': 'US', '076': 'BR', '484': 'MX', '156': 'CN', '356': 'IN', '702': 'SG', '036': 'AU' };

type Row = { code: string; name: string; value: number; formatted: string; isPositive: boolean };
type Payload = { rows: Row[] };

function color(v: number) {
  const red = [220, 38, 38];
  const yellow = [245, 158, 11];
  const green = [22, 163, 74];
  const a = v < 0.5 ? red : yellow;
  const b = v < 0.5 ? yellow : green;
  const t = v < 0.5 ? v * 2 : (v - 0.5) * 2;
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`;
}

export default function PerformanceMap({ definition, filters }: WidgetContentProps) {
  const { data, loading } = useVisualData<Payload>(definition.type, filters);
  const byCode = new Map((data?.rows ?? []).map(row => [row.code, row]));
  return <div className="flex h-full w-full flex-col"><div className="min-h-0 flex-1">{loading ? <span className="text-[12px] text-[var(--color-fg-muted)]">Loading...</span> : <ComposableMap projection="geoMercator" projectionConfig={{ center: [8, 32], scale: 120 }} style={{ width: '100%', height: '100%' }}><Geographies geography={GEO_URL}>{({ geographies }) => geographies.map(geo => { const code = NUMERIC_TO_A2[String(geo.id ?? '').padStart(3, '0')]; const row = code ? byCode.get(code) : null; return <Geography key={geo.rsmKey} geography={geo} style={{ default: { fill: row ? color(row.value) : 'var(--color-bg-elevated)', stroke: 'var(--color-stroke-subtle)', strokeWidth: 0.4, outline: 'none' }, hover: { fill: row ? color(Math.min(row.value + 0.1, 1)) : 'var(--color-bg-elevated)', stroke: 'var(--color-fg-default)', strokeWidth: 0.5, outline: 'none' }, pressed: { fill: 'var(--color-accent)', outline: 'none' } }} />; })}</Geographies></ComposableMap>}</div><div className="flex items-center gap-2 px-1 text-[10px] text-[var(--color-fg-muted)]"><span>Lower</span><div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-green-600" /><span>Higher</span></div></div>;
}
