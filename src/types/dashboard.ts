export type TimeFrame = '7d' | '30d' | '90d' | '1y' | 'all';
export type GeoRegion = 'global';
export type Channel = string;
export const ALL_CHANNELS: Channel[] = [];
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface FilterState {
  timeframe: TimeFrame;
  geo: GeoRegion;
  channel: Channel[];
  frequency: Frequency;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  isFavorite: boolean;
  isPublishedToCommunity?: boolean;
  author?: { name: string; email: string };
  collaborators?: Collaborator[];
  createdAt: string;
  updatedAt: string;
  tabs: DashboardTab[];
}

export interface DashboardTab {
  id: string;
  name: string;
  widgets: WidgetInstance[];
  order: number;
  level?: 0 | 1 | 2 | 3;
  kpiKey?: string;
}

export type WidgetCategory = 'kpis' | 'charts' | 'tables' | 'filters' | 'ai-agents';

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  defaultW: number;
  defaultH: number;
  supportedFilters: (keyof FilterState)[];
}

export interface WidgetInstance {
  id: string;
  type: string;
  layout: WidgetLayout;
  filters?: Partial<FilterState>;
}

export interface WidgetLayout { x: number; y: number; w: number; h: number; }
export type WidgetSize = 'xs' | 'sm' | 'md' | 'lg';

export interface WidgetContentProps {
  widgetId: string;
  definition: WidgetDefinition;
  filters?: Partial<FilterState>;
  size?: WidgetSize;
  width?: number;
}

export type Permission = 'view' | 'edit';
export interface Collaborator { type: 'user'; email: string; name?: string; permission: Permission; }
export type PanelType = 'gallery' | 'ai' | null;
export type ViewMode = 'view' | 'customize';
