'use client';

import { createContext, useContext, useCallback, ReactNode, createElement } from 'react';
import type { FilterState, TimeFrame } from '@/types/dashboard';
import { usePersistedState } from '@/lib/use-persisted-state';

interface FilterStoreState {
  globalFilters: FilterState;
  widgetOverrides: Record<string, Partial<FilterState>>;
  setGlobalTimeframe: (tf: TimeFrame) => void;
  setWidgetOverride: (widgetId: string, filters: Partial<FilterState>) => void;
  clearWidgetOverride: (widgetId: string) => void;
  getEffectiveFilters: (widgetId: string) => FilterState;
  hasMixedFilter: (dimension: keyof FilterState) => boolean;
  resetGlobalFilters: () => void;
}

const defaultFilters: FilterState = { timeframe: '1y', geo: 'global', channel: [], frequency: 'monthly' };
const FilterContext = createContext<FilterStoreState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [globalFilters, setGlobalFilters] = usePersistedState<FilterState>('metyis:globalFilters', defaultFilters);
  const [widgetOverrides, setWidgetOverrides] = usePersistedState<Record<string, Partial<FilterState>>>('metyis:widgetOverrides', {});

  const setGlobalTimeframe = useCallback((tf: TimeFrame) => setGlobalFilters(prev => ({ ...prev, timeframe: tf })), [setGlobalFilters]);
  const setWidgetOverride = useCallback((widgetId: string, filters: Partial<FilterState>) => setWidgetOverrides(prev => ({ ...prev, [widgetId]: { ...prev[widgetId], ...filters } })), [setWidgetOverrides]);
  const clearWidgetOverride = useCallback((widgetId: string) => setWidgetOverrides(prev => { const next = { ...prev }; delete next[widgetId]; return next; }), [setWidgetOverrides]);
  const getEffectiveFilters = useCallback((widgetId: string): FilterState => ({ ...globalFilters, ...(widgetOverrides[widgetId] || {}) }), [globalFilters, widgetOverrides]);
  const hasMixedFilter = useCallback((dimension: keyof FilterState): boolean => Object.values(widgetOverrides).some(o => dimension in o), [widgetOverrides]);
  const resetGlobalFilters = useCallback(() => { setGlobalFilters(defaultFilters); setWidgetOverrides({}); }, [setGlobalFilters, setWidgetOverrides]);

  return createElement(FilterContext.Provider, { value: { globalFilters, widgetOverrides, setGlobalTimeframe, setWidgetOverride, clearWidgetOverride, getEffectiveFilters, hasMixedFilter, resetGlobalFilters }, children });
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
