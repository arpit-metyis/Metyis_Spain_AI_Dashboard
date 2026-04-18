'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUI } from '@/stores/ui-store';
import { useDashboard } from '@/stores/dashboard-store';
import { GlobalOptions } from '@/components/filters/GlobalOptions';
import { IconButton } from '@/components/ui/IconButton';
import { AdaptivePopover } from '@/components/ui/AdaptivePopover';
import { UserMenu } from '@/components/auth/UserMenu';

function BrandMark() {
  return <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-accent)] text-[12px] font-bold text-white">MS</div><div className="hidden sm:block"><p className="text-[13px] font-semibold leading-none text-[var(--color-fg-default)]">Metyis Spain</p><p className="text-[10px] leading-none text-[var(--color-fg-muted)]">AI Dashboard</p></div></div>;
}

function DataSourceIndicator() {
  const [source, setSource] = useState<'loading' | 'azure' | 'mock' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled) return;
        setSource(payload?.repository?.source === 'azure-sql-facts' ? 'azure' : 'mock');
      })
      .catch(() => {
        if (!cancelled) setSource('error');
      });
    return () => { cancelled = true; };
  }, []);

  const isAzure = source === 'azure';
  const label = source === 'loading' ? 'Checking data' : isAzure ? 'Azure SQL' : source === 'mock' ? 'Mock data' : 'Data offline';
  const color = isAzure ? 'var(--color-dataviz-positive)' : source === 'error' ? 'var(--color-dataviz-negative)' : 'var(--color-fg-muted)';

  return (
    <div className="hidden h-8 items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-2.5 text-[11px] font-semibold text-[var(--color-fg-muted)] md:flex" title={isAzure ? 'Connected to Azure SQL' : label}>
      <span className="material-symbols-rounded text-[14px]" style={{ color }}>database</span>
      <span>{label}</span>
    </div>
  );
}

export function AppHeader() {
  const { viewMode, toggleViewMode, togglePanel, activePanel, toggleTheme, theme } = useUI();
  const { getActiveDashboard, activeDashboardId, snapshotLayout, resetLayout } = useDashboard();
  const pathname = usePathname();
  const dashboard = getActiveDashboard();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const isCustomizing = viewMode === 'customize';
  const isSimulator = pathname?.startsWith('/simulator');

  const handleToggleViewMode = useCallback(() => {
    if (!isCustomizing && activeDashboardId) snapshotLayout(activeDashboardId);
    toggleViewMode();
  }, [isCustomizing, activeDashboardId, snapshotLayout, toggleViewMode]);

  const overflowContent = <><div className="px-1 pt-1 pb-2"><GlobalOptions stacked /></div><div className="mx-2 my-1 border-t border-[var(--color-stroke-subtle)]" /><button onClick={() => { handleToggleViewMode(); setOverflowOpen(false); }} className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]" style={{ width: 'calc(100% - 8px)' }}><span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">{isCustomizing ? 'check' : 'edit'}</span>{isCustomizing ? 'Done' : 'Edit'}</button>{isCustomizing && <><button onClick={() => { togglePanel('gallery'); setOverflowOpen(false); }} className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]" style={{ width: 'calc(100% - 8px)' }}><span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">add_circle</span>Add Widgets</button><button onClick={() => { if (activeDashboardId) resetLayout(activeDashboardId); setOverflowOpen(false); }} className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]" style={{ width: 'calc(100% - 8px)' }}><span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">restart_alt</span>Reset Layout</button></>}<div className="mx-2 my-1 border-t border-[var(--color-stroke-subtle)]" /><button onClick={() => { togglePanel('ai'); setOverflowOpen(false); }} className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]" style={{ width: 'calc(100% - 8px)' }}><span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">smart_toy</span>AI Assistant</button><button onClick={() => { toggleTheme(); setOverflowOpen(false); }} className="flex items-center gap-2.5 mx-1 rounded-[var(--radii-button)] px-2 py-2 text-[12px] text-[var(--color-fg-default)] hover:bg-[var(--color-bg-menu-hover)]" style={{ width: 'calc(100% - 8px)' }}><span className="material-symbols-rounded text-[16px] text-[var(--color-fg-muted)]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button></>;

  const nav = <nav className="hidden items-center gap-1 rounded-full bg-[var(--color-bg-subtle)] p-1 sm:flex"><Link href="/" className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!isSimulator ? 'bg-[var(--color-bg-card)] text-[var(--color-fg-default)] shadow-sm' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'}`}>Control Tower</Link><Link href="/simulator" className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${isSimulator ? 'bg-[var(--color-bg-card)] text-[var(--color-fg-default)] shadow-sm' : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]'}`}>Scenario Simulator</Link></nav>;

  if (isSimulator) {
    return <motion.header className="flex h-14 items-center gap-3 bg-[var(--color-bg-card)] px-4 shadow-[var(--shadow-widget)]" initial={{ y: -56 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}><BrandMark /><div className="h-5 w-px shrink-0 bg-[var(--color-stroke-subtle)]" />{nav}<h1 className="truncate text-[14px] font-semibold text-[var(--color-fg-default)] sm:hidden">Scenario Simulator</h1><div className="ml-auto flex items-center gap-2"><DataSourceIndicator /><UserMenu /></div></motion.header>;
  }

  return <motion.header className="flex h-14 items-center gap-3 bg-[var(--color-bg-card)] px-4 shadow-[var(--shadow-widget)]" initial={{ y: -56 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}><BrandMark /><div className="h-5 w-px shrink-0 bg-[var(--color-stroke-subtle)]" />{nav}<h1 className="hidden truncate text-[14px] font-semibold text-[var(--color-fg-default)] lg:block">{dashboard?.name || 'Control Tower'}</h1>{isCustomizing ? <div className="hidden sm:flex flex-1 items-center justify-center gap-2"><button onClick={() => togglePanel('gallery')} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${activePanel === 'gallery' ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-subtle)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg-default)]'}`}><span className="material-symbols-rounded text-[14px]">add_circle</span>Add Widgets</button><button onClick={() => activeDashboardId && resetLayout(activeDashboardId)} className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-3 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg-default)]"><span className="material-symbols-rounded text-[14px]">restart_alt</span>Reset Layout</button></div> : <div className="hidden min-w-0 flex-1 sm:flex"><GlobalOptions /></div>}<div className="ml-auto flex items-center gap-2"><DataSourceIndicator /><button onClick={handleToggleViewMode} className="hidden h-8 items-center gap-1.5 rounded-full bg-[var(--color-bg-subtle)] px-3 text-xs font-medium text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-fg-default)] xs:flex"><span className="material-symbols-rounded text-[14px]">{viewMode === 'view' ? 'edit' : 'check'}</span>{viewMode === 'view' ? 'Edit' : 'Done'}</button><div className="hidden sm:flex"><IconButton tooltip="AI Assistant" active={activePanel === 'ai'} onClick={() => togglePanel('ai')}><span className="material-symbols-rounded text-[16px]">smart_toy</span></IconButton></div><UserMenu /><div className="sm:hidden"><AdaptivePopover open={overflowOpen} onOpenChange={setOverflowOpen} width={260} trigger={<IconButton onClick={() => setOverflowOpen(!overflowOpen)}><span className="material-symbols-rounded text-[16px]">more_vert</span></IconButton>}>{overflowContent}</AdaptivePopover></div></div></motion.header>;
}
