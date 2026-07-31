export interface ISparklineGeometry {
  line: string;
  area: string;
}

/**
 * Converts a numeric series into SVG paths inside a normalised 0–100 × 0–100
 * viewBox, so the same geometry scales to any card size.
 */
export function buildSparklineGeometry(series: readonly number[]): ISparklineGeometry {
  if (series.length < 2) return { line: '', area: '' };

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = 100 / (series.length - 1);

  const points = series.map((value, index) => {
    const x = index * step;
    // Inset by 6% top and bottom so peaks never touch the clip edge.
    const y = 94 - ((value - min) / span) * 88;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return {
    line: `M${points.join(' L')}`,
    area: `M0,100 L${points.join(' L')} L100,100 Z`,
  };
}
