'use client';

import { createContext, useContext, useState, useCallback, ReactNode, createElement } from 'react';
import type { KpiKey } from '@/data/metyis-data';

interface SelectionState {
  activeGeo: string | null;
  activeKpi: KpiKey;
  activeProduct: string | null;
  activeBusinessUnit: string | null;
  setActiveGeo: (geo: string | null) => void;
  setActiveKpi: (kpi: KpiKey) => void;
  setActiveProduct: (type: string | null) => void;
  setActiveBusinessUnit: (unit: string | null) => void;
  clearAll: () => void;
}

const SelectionContext = createContext<SelectionState | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [activeGeo, setActiveGeoState] = useState<string | null>(null);
  const [activeKpi, setActiveKpiState] = useState<KpiKey>('revenue');
  const [activeProduct, setActiveProductState] = useState<string | null>(null);
  const [activeBusinessUnit, setActiveBusinessUnitState] = useState<string | null>(null);

  const clearAll = useCallback(() => {
    setActiveGeoState(null);
    setActiveProductState(null);
    setActiveBusinessUnitState(null);
    setActiveKpiState('revenue');
  }, []);

  return createElement(SelectionContext.Provider, {
    value: {
      activeGeo,
      activeKpi,
      activeProduct,
      activeBusinessUnit,
      setActiveGeo: setActiveGeoState,
      setActiveKpi: setActiveKpiState,
      setActiveProduct: setActiveProductState,
      setActiveBusinessUnit: setActiveBusinessUnitState,
      clearAll,
    },
    children,
  });
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}
