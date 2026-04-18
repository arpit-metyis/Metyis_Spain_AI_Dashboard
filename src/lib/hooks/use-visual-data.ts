'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSelection } from '@/stores/selection-store';
import type { FilterState } from '@/types/dashboard';

export function useVisualData<T = unknown>(widgetType: string, filters?: Partial<FilterState>) {
  const { activeGeo, activeKpi, activeProduct, activeBusinessUnit } = useSelection();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ widgetType, kpiKey: activeKpi, timeframe: filters?.timeframe ?? '1y' });
    if (activeGeo) params.set('geo', activeGeo);
    if (activeProduct) params.set('product', activeProduct);
    if (activeBusinessUnit) params.set('businessUnit', activeBusinessUnit);
    return params.toString();
  }, [widgetType, activeKpi, activeGeo, activeProduct, activeBusinessUnit, filters?.timeframe]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/visual-data?${query}`)
      .then(async response => {
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      })
      .then(json => { if (!cancelled) setData(json as T); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load data'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  return { data, loading, error };
}
