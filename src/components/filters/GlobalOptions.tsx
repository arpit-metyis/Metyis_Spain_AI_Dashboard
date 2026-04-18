'use client';

import { useMemo } from 'react';
import { useFilters } from '@/stores/filter-store';
import { AdaptiveSelect } from '@/components/ui/AdaptiveSelect';
import { timeframeOptions } from '@/lib/filter-options';
import { useSelection } from '@/stores/selection-store';
import { BUSINESS_UNITS, PRODUCT_LINES, REGIONS, KPI_KEYS, KPI_META } from '@/data/metyis-data';

const businessUnitOptions = [{ value: '', label: 'All Units' }, ...BUSINESS_UNITS.map(b => ({ value: b.key, label: b.label }))];
const productOptions = [{ value: '', label: 'All Offerings' }, ...PRODUCT_LINES.map(p => ({ value: p.key, label: p.label }))];
const geoOptions = [
  { value: '', label: 'Global' },
  ...REGIONS.flatMap(region => [
    { value: region.key, label: region.label },
    ...region.countries.map(country => ({ value: country.code, label: country.name, indent: true as const })),
  ]),
];
const kpiOptions = KPI_KEYS.map(key => ({ value: key, label: KPI_META[key].label }));

type OptionDef = {
  key: string;
  label: string;
  options: readonly { value: string; label: string; indent?: boolean }[];
  value: string;
  onChange: (v: string) => void;
  mixed?: boolean;
  searchable?: boolean;
};

export function GlobalOptions({ stacked }: { stacked?: boolean } = {}) {
  const { globalFilters, setGlobalTimeframe, hasMixedFilter } = useFilters();
  const { activeBusinessUnit, setActiveBusinessUnit, activeProduct, setActiveProduct, activeGeo, setActiveGeo, activeKpi, setActiveKpi } = useSelection();

  const optionDefs = useMemo((): OptionDef[] => [
    { key: 'kpi', label: 'KPI', options: kpiOptions, value: activeKpi, onChange: v => setActiveKpi(v as typeof activeKpi) },
    { key: 'business-unit', label: 'Business Unit', options: businessUnitOptions, value: activeBusinessUnit ?? '', onChange: v => setActiveBusinessUnit(v || null) },
    { key: 'product', label: 'Offering', options: productOptions, value: activeProduct ?? '', onChange: v => setActiveProduct(v || null) },
    { key: 'geo', label: 'Market', options: geoOptions, value: activeGeo ?? '', onChange: v => setActiveGeo(v || null), searchable: true },
    { key: 'time', label: 'Time', options: timeframeOptions, value: globalFilters.timeframe, onChange: setGlobalTimeframe as (v: string) => void, mixed: hasMixedFilter('timeframe') },
  ], [activeKpi, setActiveKpi, activeBusinessUnit, setActiveBusinessUnit, activeProduct, setActiveProduct, activeGeo, setActiveGeo, globalFilters.timeframe, setGlobalTimeframe, hasMixedFilter]);

  return (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex w-full items-center justify-center gap-2 overflow-hidden'}>
      {optionDefs.map(f => (
        <div key={f.key} className={stacked ? '' : 'shrink-0'}>
          <AdaptiveSelect
            label={f.label}
            options={f.options as { value: string; label: string; indent?: boolean }[]}
            value={f.value}
            onChange={f.onChange}
            mixed={!!f.mixed}
            searchable={f.searchable}
          />
        </div>
      ))}
    </div>
  );
}
