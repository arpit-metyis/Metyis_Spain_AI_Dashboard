/**
 * JS helpers for resolving dataviz CSS custom-property tokens at runtime.
 * SSR-safe: returns '' when window is undefined.
 *
 * Carbon Charts palette: 14 categorical, 4 sequential ramps
 * (blue/purple/cyan/teal), 2 diverging ramps (redCyan/purpleTeal), semantic.
 */

const CATEGORICAL_COUNT = 14;
const SEQ_COUNTS = { blue: 10, purple: 10, cyan: 9, teal: 9 } as const;
const DIV_COUNTS = { rc: 15, pt: 15 } as const;
const DEFAULT_SEQ = 'blue' satisfies SeqRamp;
const DEFAULT_DIV = 'pt' satisfies DivRamp;

export type SemanticName = 'positive' | 'negative' | 'warning' | 'neutral' | 'info';
export type SeqRamp = keyof typeof SEQ_COUNTS;
export type DivRamp = keyof typeof DIV_COUNTS;

// ── var() strings (reactive to theme — no JS resolution needed) ──────

function catVar(n: number) {
  return `var(--color-dataviz-cat-${String(n).padStart(2, '0')})`;
}
function seqVar(n: number) {
  return `var(--color-dataviz-seq-${String(n).padStart(2, '0')})`;
}
function seqNamedVar(ramp: string, n: number) {
  return `var(--color-dataviz-seq-${ramp}-${String(n).padStart(2, '0')})`;
}
function divVar(n: number) {
  return `var(--color-dataviz-div-${String(n).padStart(2, '0')})`;
}
function divNamedVar(ramp: string, n: number) {
  return `var(--color-dataviz-div-${ramp}-${String(n).padStart(2, '0')})`;
}
function semVar(name: string) {
  return `var(--color-dataviz-${name})`;
}

function buildRecord(count: number, varFn: (n: number) => string): Record<number, string> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, i) => [i + 1, varFn(i + 1)]),
  ) as Record<number, string>;
}

export const datavizVars = {
  cat: buildRecord(CATEGORICAL_COUNT, catVar),
  seq: buildRecord(SEQ_COUNTS[DEFAULT_SEQ], seqVar),
  seqBlue: buildRecord(SEQ_COUNTS.blue, (n) => seqNamedVar('blue', n)),
  seqPurple: buildRecord(SEQ_COUNTS.purple, (n) => seqNamedVar('purple', n)),
  seqCyan: buildRecord(SEQ_COUNTS.cyan, (n) => seqNamedVar('cyan', n)),
  seqTeal: buildRecord(SEQ_COUNTS.teal, (n) => seqNamedVar('teal', n)),
  div: buildRecord(DIV_COUNTS[DEFAULT_DIV], divVar),
  divRc: buildRecord(DIV_COUNTS.rc, (n) => divNamedVar('rc', n)),
  divPt: buildRecord(DIV_COUNTS.pt, (n) => divNamedVar('pt', n)),
  positive: semVar('positive'),
  negative: semVar('negative'),
  warning: semVar('warning'),
  neutral: semVar('neutral'),
  info: semVar('info'),
};

// ── Resolved hex helpers (for chart libs that need concrete values) ───

function resolve(prop: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

/** Array of categorical color var() strings (1-indexed internally, 0-indexed output).
 *  Always returns colors in palette order: cat-01, cat-02, cat-03, …
 *  Use this for consistent, predictable color assignment in charts. */
export function getCategoricalColors(count: number = CATEGORICAL_COUNT): string[] {
  return Array.from({ length: count }, (_, i) => catVar((i % CATEGORICAL_COUNT) + 1));
}

/** Like getCategoricalColors but resolved to concrete hex via getComputedStyle.
 *  Only use when a library truly cannot accept var() strings. */
export function getCategoricalColorsResolved(count: number = CATEGORICAL_COUNT): string[] {
  return Array.from({ length: count }, (_, i) =>
    resolve(`--color-dataviz-cat-${String((i % CATEGORICAL_COUNT) + 1).padStart(2, '0')}`),
  );
}

/** Single categorical color by 1-based index (wraps via modulo). */
export function getCategoricalColor(index: number): string {
  const n = ((index - 1) % CATEGORICAL_COUNT) + 1;
  return resolve(`--color-dataviz-cat-${String(n).padStart(2, '0')}`);
}

/** Resolved semantic color by name. */
export function getSemanticColor(name: SemanticName): string {
  return resolve(`--color-dataviz-${name}`);
}

/** Full sequential ramp as var() strings. */
export function getSequentialColors(ramp: SeqRamp = DEFAULT_SEQ): string[] {
  const count = SEQ_COUNTS[ramp];
  return Array.from({ length: count }, (_, i) => seqNamedVar(ramp, i + 1));
}

/** Full sequential ramp as resolved hex strings. */
export function getSequentialColorsResolved(ramp: SeqRamp = DEFAULT_SEQ): string[] {
  const count = SEQ_COUNTS[ramp];
  return Array.from({ length: count }, (_, i) =>
    resolve(`--color-dataviz-seq-${ramp}-${String(i + 1).padStart(2, '0')}`),
  );
}

/** Single sequential step (1-based, clamped). */
export function getSequentialColor(step: number, ramp: SeqRamp = DEFAULT_SEQ): string {
  const count = SEQ_COUNTS[ramp];
  const s = Math.max(1, Math.min(count, step));
  return resolve(`--color-dataviz-seq-${ramp}-${String(s).padStart(2, '0')}`);
}

/** Full diverging ramp as var() strings. */
export function getDivergingColors(ramp: DivRamp = DEFAULT_DIV): string[] {
  const count = DIV_COUNTS[ramp];
  return Array.from({ length: count }, (_, i) => divNamedVar(ramp, i + 1));
}

/** Full diverging ramp as resolved hex strings. */
export function getDivergingColorsResolved(ramp: DivRamp = DEFAULT_DIV): string[] {
  const count = DIV_COUNTS[ramp];
  return Array.from({ length: count }, (_, i) =>
    resolve(`--color-dataviz-div-${ramp}-${String(i + 1).padStart(2, '0')}`),
  );
}

/** Single diverging step (1-based, clamped). */
export function getDivergingColor(step: number, ramp: DivRamp = DEFAULT_DIV): string {
  const count = DIV_COUNTS[ramp];
  const s = Math.max(1, Math.min(count, step));
  return resolve(`--color-dataviz-div-${ramp}-${String(s).padStart(2, '0')}`);
}

// ── Layout constants ──────────────────────────────────────────────────

/** Vertical gap (px) between chart area and legend. */
export const LEGEND_GAP = 8;
