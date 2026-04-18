'use client';

import { useEffect, useRef } from 'react';
import { useDashboard } from '@/stores/dashboard-store';
import { AppHeader } from '@/components/layout/AppHeader';
import { TabBar } from '@/components/layout/TabBar';
import { PanelLayout } from '@/components/layout/PanelLayout';
import { DashboardGrid } from '@/components/grid/DashboardGrid';
import { CONTROL_TOWER_DASHBOARD_ID } from '@/lib/metyis-control-tower';

export default function Home() {
  const { setActiveDashboard, setActiveTab, getActiveDashboard, activeTabId } = useDashboard();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setActiveDashboard(CONTROL_TOWER_DASHBOARD_ID);
    const dash = getActiveDashboard();
    if (dash?.tabs[0] && !activeTabId) setActiveTab(dash.tabs[0].id);
  }, [setActiveDashboard, getActiveDashboard, activeTabId, setActiveTab]);

  return <div className="flex h-screen flex-col bg-[var(--color-bg-screen)]"><AppHeader /><TabBar /><div className="flex-1 overflow-hidden"><PanelLayout><DashboardGrid /></PanelLayout></div></div>;
}
