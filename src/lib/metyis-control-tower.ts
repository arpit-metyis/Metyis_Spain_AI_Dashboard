import type { Dashboard } from '@/types/dashboard';

export const CONTROL_TOWER_DASHBOARD_ID = 'control-tower';

export const metyisControlTower: Dashboard = {
  id: CONTROL_TOWER_DASHBOARD_ID,
  name: 'Control Tower',
  description: 'Metyis Spain business analytics control tower',
  isFavorite: true,
  createdAt: '2026-04-17T00:00:00.000Z',
  updatedAt: '2026-04-17T00:00:00.000Z',
  tabs: [
    {
      id: 'overview',
      name: 'Overview',
      order: 0,
      level: 0,
      widgets: [
        { id: 'w-revenue', type: 'kpi-revenue', layout: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'w-margin', type: 'kpi-margin', layout: { x: 4, y: 0, w: 4, h: 2 } },
        { id: 'w-units', type: 'kpi-units', layout: { x: 8, y: 0, w: 4, h: 2 } },
        { id: 'w-churn', type: 'churn-overview', layout: { x: 12, y: 0, w: 6, h: 2 } },
        { id: 'w-pricing', type: 'pricing-deviations', layout: { x: 18, y: 0, w: 6, h: 2 } },
        { id: 'w-map', type: 'performance-map', layout: { x: 0, y: 2, w: 14, h: 7 } },
        { id: 'w-ranking', type: 'country-ranking', layout: { x: 14, y: 2, w: 10, h: 7 } },
        { id: 'w-bu-mix', type: 'business-unit-mix', layout: { x: 0, y: 9, w: 8, h: 4 } },
        { id: 'w-product-mix', type: 'product-mix', layout: { x: 8, y: 9, w: 8, h: 4 } },
        { id: 'w-trend', type: 'trend-line', layout: { x: 16, y: 9, w: 8, h: 4 } },
      ],
    },
    {
      id: 'commercial',
      name: 'Commercial',
      order: 1,
      level: 1,
      widgets: [
        { id: 'w-pipeline', type: 'kpi-pipeline', layout: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'w-nps', type: 'kpi-nps', layout: { x: 4, y: 0, w: 4, h: 2 } },
        { id: 'w-commercial-map', type: 'performance-map', layout: { x: 8, y: 0, w: 10, h: 6 } },
        { id: 'w-commercial-ranking', type: 'country-ranking', layout: { x: 18, y: 0, w: 6, h: 6 } },
        { id: 'w-commercial-trend', type: 'trend-line', layout: { x: 0, y: 2, w: 8, h: 4 } },
      ],
    },
    {
      id: 'operations',
      name: 'Operations',
      order: 2,
      level: 1,
      widgets: [
        { id: 'w-productivity', type: 'kpi-productivity', layout: { x: 0, y: 0, w: 4, h: 2 } },
        { id: 'w-ops-units', type: 'kpi-units', layout: { x: 4, y: 0, w: 4, h: 2 } },
        { id: 'w-ops-product', type: 'product-mix', layout: { x: 8, y: 0, w: 8, h: 5 } },
        { id: 'w-ops-bu', type: 'business-unit-mix', layout: { x: 16, y: 0, w: 8, h: 5 } },
        { id: 'w-ops-trend', type: 'trend-line', layout: { x: 0, y: 2, w: 8, h: 4 } },
      ],
    },
  ],
};
