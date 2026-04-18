export const GRID_BREAKPOINTS = { xl: 1200, lg: 996, md: 768, sm: 480, xs: 0 } as const;
export const GRID_COLS = { xl: 24, lg: 16, md: 8, sm: 4, xs: 2 } as const;
export const GRID_MARGIN: [number, number] = [12, 12];
export const GRID_CONTAINER_PADDING: [number, number] = [16, 16];
export const HEADER_HEIGHT = 56;
export const TAB_BAR_HEIGHT = 44;
export const MIN_ROW_HEIGHT = 40;

// Vertical breakpoints: fewer target rows on shorter viewports so rows
// stay large enough to be useful while still fitting the viewport.
const VERTICAL_BREAKPOINTS: [number, number][] = [
  // [minViewportHeight, targetRows]
  [1080, 12],
  [860,  10],
  [680,   8],
  [0,     6],
];

function getTargetRows(viewportHeight: number): number {
  for (const [minH, rows] of VERTICAL_BREAKPOINTS) {
    if (viewportHeight >= minH) return rows;
  }
  return 6;
}

export function calculateRowHeight(viewportHeight: number): number {
  const targetRows = getTargetRows(viewportHeight);
  const availableHeight = viewportHeight - HEADER_HEIGHT - TAB_BAR_HEIGHT - GRID_CONTAINER_PADDING[1];
  const rowHeight = Math.floor(availableHeight / targetRows) - GRID_MARGIN[1];
  return Math.max(rowHeight, MIN_ROW_HEIGHT);
}

export function getBreakpointFromWidth(width: number): keyof typeof GRID_BREAKPOINTS {
  if (width >= GRID_BREAKPOINTS.xl) return 'xl';
  if (width >= GRID_BREAKPOINTS.lg) return 'lg';
  if (width >= GRID_BREAKPOINTS.md) return 'md';
  if (width >= GRID_BREAKPOINTS.sm) return 'sm';
  return 'xs';
}
