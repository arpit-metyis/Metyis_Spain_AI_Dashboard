'use client';

import { createContext, useContext, useCallback, useEffect, useRef, ReactNode, createElement } from 'react';
import type { Dashboard, DashboardTab, WidgetInstance, WidgetLayout } from '@/types/dashboard';
import { widgetRegistry } from '@/lib/widget-registry';
import { usePersistedState } from '@/lib/use-persisted-state';
import { metyisControlTower, CONTROL_TOWER_DASHBOARD_ID } from '@/lib/metyis-control-tower';

interface DashboardStoreState {
  dashboards: Dashboard[];
  activeDashboardId: string;
  activeTabId: string | null;
  setActiveDashboard: (id: string | null) => void;
  addTab: (dashboardId: string, name?: string) => DashboardTab;
  removeTab: (dashboardId: string, tabId: string) => void;
  renameTab: (dashboardId: string, tabId: string, name: string) => void;
  reorderTabs: (dashboardId: string, tabIds: string[]) => void;
  setActiveTab: (tabId: string) => void;
  addWidget: (dashboardId: string, tabId: string, widgetType: string, position?: { x: number; y: number }) => void;
  removeWidget: (dashboardId: string, tabId: string, widgetId: string) => void;
  updateLayout: (dashboardId: string, tabId: string, layouts: { id: string; layout: WidgetLayout }[]) => void;
  snapshotLayout: (dashboardId: string) => void;
  resetLayout: (dashboardId: string) => void;
  getActiveDashboard: () => Dashboard | undefined;
  getActiveTab: () => DashboardTab | undefined;
}

let idCounter = 0;
function genId(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`; }

const DashboardContext = createContext<DashboardStoreState | null>(null);

function normalizeDashboards(dashboards: Dashboard[]): Dashboard[] {
  const existing = dashboards.find(d => d.id === CONTROL_TOWER_DASHBOARD_ID);
  if (!existing) return [metyisControlTower];
  if (dashboards.length === 1 && dashboards[0].id === CONTROL_TOWER_DASHBOARD_ID) return dashboards;
  return [existing];
}

async function persistLayout(dashboard: Dashboard) {
  try {
    await fetch('/api/dashboard/layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardId: dashboard.id, tabs: dashboard.tabs }),
    });
  } catch {
    // localStorage remains the fallback for local development/offline use.
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [dashboards, setDashboards] = usePersistedState<Dashboard[]>('metyis:dashboards', [metyisControlTower]);
  const [activeDashboardId, setActiveDashboardId] = usePersistedState<string>('metyis:activeDashboardId', CONTROL_TOWER_DASHBOARD_ID);
  const [activeTabId, setActiveTab] = usePersistedState<string | null>('metyis:activeTabId', 'overview');
  const layoutSnapshotRef = useRef<Map<string, Dashboard['tabs']>>(new Map());

  const safeDashboards = normalizeDashboards(dashboards);
  if (safeDashboards !== dashboards && typeof window !== 'undefined') {
    setTimeout(() => setDashboards(safeDashboards), 0);
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/layout?dashboardId=${CONTROL_TOWER_DASHBOARD_ID}`)
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !payload?.tabs || !Array.isArray(payload.tabs)) return;
        setDashboards(prev => {
          const current = normalizeDashboards(prev)[0];
          return [{ ...current, tabs: payload.tabs, updatedAt: payload.updatedAt ?? current.updatedAt }];
        });
      })
      .catch(() => {
        // localStorage remains the offline/local fallback.
      });
    return () => { cancelled = true; };
  }, [setDashboards]);

  const setActiveDashboard = useCallback(() => {
    setActiveDashboardId(CONTROL_TOWER_DASHBOARD_ID);
  }, [setActiveDashboardId]);

  const mutateDashboard = useCallback((fn: (dashboard: Dashboard) => Dashboard) => {
    setDashboards(prev => {
      const current = normalizeDashboards(prev)[0];
      const nextDashboard = fn(current);
      void persistLayout(nextDashboard);
      return [nextDashboard];
    });
  }, [setDashboards]);

  const addTab = useCallback((dashboardId: string, name?: string) => {
    const newTab: DashboardTab = { id: genId('tab'), name: name || 'New View', order: 0, widgets: [] };
    mutateDashboard(d => ({ ...d, tabs: [...d.tabs, { ...newTab, order: d.tabs.length }], updatedAt: new Date().toISOString() }));
    setActiveTab(newTab.id);
    return newTab;
  }, [mutateDashboard, setActiveTab]);

  const removeTab = useCallback((dashboardId: string, tabId: string) => {
    mutateDashboard(d => d.tabs.length <= 1 ? d : { ...d, tabs: d.tabs.filter(t => t.id !== tabId).map((t, i) => ({ ...t, order: i })), updatedAt: new Date().toISOString() });
    if (activeTabId === tabId) setActiveTab('overview');
  }, [activeTabId, mutateDashboard, setActiveTab]);

  const renameTab = useCallback((dashboardId: string, tabId: string, name: string) => {
    mutateDashboard(d => ({ ...d, tabs: d.tabs.map(t => t.id === tabId ? { ...t, name } : t), updatedAt: new Date().toISOString() }));
  }, [mutateDashboard]);

  const reorderTabs = useCallback((dashboardId: string, tabIds: string[]) => {
    mutateDashboard(d => {
      const map = new Map(d.tabs.map(t => [t.id, t]));
      return { ...d, tabs: tabIds.map((id, order) => ({ ...map.get(id)!, order })), updatedAt: new Date().toISOString() };
    });
  }, [mutateDashboard]);

  const addWidget = useCallback((dashboardId: string, tabId: string, widgetType: string, position?: { x: number; y: number }) => {
    const def = widgetRegistry[widgetType];
    if (!def) return;
    mutateDashboard(d => ({
      ...d,
      tabs: d.tabs.map(t => {
        if (t.id !== tabId) return t;
        const nextY = position?.y ?? t.widgets.reduce((max, widget) => Math.max(max, widget.layout.y + widget.layout.h), 0);
        const widget: WidgetInstance = {
          id: genId('w'),
          type: widgetType,
          layout: { x: position?.x ?? 0, y: nextY, w: def.defaultW, h: def.defaultH },
        };
        return { ...t, widgets: [...t.widgets, widget] };
      }),
      updatedAt: new Date().toISOString(),
    }));
  }, [mutateDashboard]);

  const removeWidget = useCallback((dashboardId: string, tabId: string, widgetId: string) => {
    mutateDashboard(d => ({ ...d, tabs: d.tabs.map(t => t.id === tabId ? { ...t, widgets: t.widgets.filter(w => w.id !== widgetId) } : t), updatedAt: new Date().toISOString() }));
  }, [mutateDashboard]);

  const updateLayout = useCallback((dashboardId: string, tabId: string, layouts: { id: string; layout: WidgetLayout }[]) => {
    mutateDashboard(d => ({
      ...d,
      tabs: d.tabs.map(t => t.id === tabId ? { ...t, widgets: t.widgets.map(w => {
        const next = layouts.find(l => l.id === w.id);
        return next ? { ...w, layout: next.layout } : w;
      }) } : t),
      updatedAt: new Date().toISOString(),
    }));
  }, [mutateDashboard]);

  const snapshotLayout = useCallback((dashboardId: string) => {
    layoutSnapshotRef.current.set(dashboardId, JSON.parse(JSON.stringify(safeDashboards[0].tabs)));
  }, [safeDashboards]);

  const resetLayout = useCallback((dashboardId: string) => {
    const snapshot = layoutSnapshotRef.current.get(dashboardId);
    if (!snapshot) return;
    mutateDashboard(d => ({ ...d, tabs: JSON.parse(JSON.stringify(snapshot)), updatedAt: new Date().toISOString() }));
  }, [mutateDashboard]);

  const getActiveDashboard = useCallback(() => safeDashboards[0], [safeDashboards]);
  const getActiveTab = useCallback(() => {
    const dash = safeDashboards[0];
    return dash.tabs.find(t => t.id === activeTabId) || dash.tabs[0];
  }, [safeDashboards, activeTabId]);

  return createElement(DashboardContext.Provider, {
    value: {
      dashboards: safeDashboards,
      activeDashboardId,
      activeTabId,
      setActiveDashboard,
      addTab,
      removeTab,
      renameTab,
      reorderTabs,
      setActiveTab,
      addWidget,
      removeWidget,
      updateLayout,
      snapshotLayout,
      resetLayout,
      getActiveDashboard,
      getActiveTab,
    },
    children,
  });
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
