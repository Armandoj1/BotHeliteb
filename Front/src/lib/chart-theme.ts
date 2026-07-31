/**
 * Shared Recharts configuration.
 *
 * The product palette is achromatic by design, so identity can never come from
 * hue alone. Two rules follow, and every chart in the app obeys them:
 *
 *  1. **At most two categorical slots per chart.** Validated with the palette
 *     checker: light `#0a0a0a ↔ #8a8a8d` (ΔE 49 normal / 48.9 CVD) and dark
 *     `#fafafa ↔ #8f8f8f` (ΔE 33.5). Both clear 3:1 contrast against their
 *     surface. A 5-slot grey ramp does *not* pass and is never used.
 *  2. **Anything with more than two categories drops the second slot entirely**
 *     and encodes by position + direct label instead (see `RankedBarList`).
 *
 * Colours resolve to CSS custom properties, so switching theme repaints every
 * chart without React re-rendering anything.
 */

/** Slot 1 — the series the chart is about. */
export const CHART_PRIMARY = 'var(--chart-1)';
/** Slot 2 — the comparison series. Never a third. */
export const CHART_SECONDARY = 'var(--chart-2)';

/** Area washes stay at ~10% so the fill never competes with the line. */
export const AREA_FILL_OPACITY = 0.1;

/** Solid hairlines only — dashed grids read as thresholds that aren't there. */
export const CHART_GRID_PROPS = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '0',
  vertical: false,
} as const;

export const CHART_AXIS_PROPS = {
  stroke: 'var(--foreground-subtle)',
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: 'var(--foreground-subtle)' },
} as const;

/** The 2px separation between stacked segments is surface-coloured, not a border. */
export const STACK_GAP_PROPS = {
  stroke: 'var(--surface)',
  strokeWidth: 2,
} as const;

/** Heights include the axis band so no card ever gets a nested scrollbar. */
export const CHART_HEIGHT = { compact: 190, default: 248 } as const;
