'use client';

import { createContext, useContext, useCallback, useState, useEffect, ReactNode, createElement } from 'react';
import type { PanelType, ViewMode } from '@/types/dashboard';
import { usePersistedState } from '@/lib/use-persisted-state';

interface UIState {
  viewMode: ViewMode;
  activePanel: PanelType;
  theme: 'dark' | 'light';
  aiPanelWidth: number;
  insightPrompt: { text: string; agentName: string } | null;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setActivePanel: (panel: PanelType) => void;
  togglePanel: (panel: 'gallery' | 'ai') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setAiPanelWidth: (width: number) => void;
  openInsight: (text: string, agentName: string) => void;
  clearInsightPrompt: () => void;
}

const UIContext = createContext<UIState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [theme, setThemeState] = usePersistedState<'dark' | 'light'>('mct:theme', 'light');
  const [aiPanelWidth, setAiPanelWidth] = usePersistedState('mct:aiPanelWidth', 380);
  const [insightPrompt, setInsightPrompt] = useState<{ text: string; agentName: string } | null>(null);

  // Sync persisted theme to DOM on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const openInsight = useCallback((text: string, agentName: string) => {
    setInsightPrompt({ text, agentName });
    setActivePanel('ai');
  }, []);

  const clearInsightPrompt = useCallback(() => {
    setInsightPrompt(null);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'customize') setActivePanel(p => p === 'gallery' ? null : p);
      return prev === 'view' ? 'customize' : 'view';
    });
  }, []);

  const togglePanel = useCallback((panel: 'gallery' | 'ai') => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  }, [setThemeState]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return createElement(UIContext.Provider, {
    value: {
      viewMode, activePanel, theme, aiPanelWidth, insightPrompt,
      setViewMode, toggleViewMode,
      setActivePanel, togglePanel,
      setTheme, toggleTheme,
      setAiPanelWidth,
      openInsight, clearInsightPrompt,
    },
    children,
  });
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
