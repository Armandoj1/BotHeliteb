import { motion } from 'framer-motion';
import { useId } from 'react';

import { cn } from '@/lib/cn';
import { buildSparklineGeometry } from '@/utils/sparkline';

export interface ISparklineProps {
  series: readonly number[];
  /** Any CSS colour; defaults to the current text colour of the parent. */
  color?: string;
  className?: string;
}

/** Dependency-free trend line — six of these are cheaper than six chart roots. */
export function Sparkline({ series, color = 'currentColor', className }: ISparklineProps) {
  const gradientId = useId();
  const { line, area } = buildSparklineGeometry(series);

  if (!line) return null;

  // Clipped, not visible: the geometry is already inset, and a bleeding stroke
  // would paint over the card's rounded edge.
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className={cn('h-10 w-full overflow-hidden', className)}
      style={{ color }}
    >
      <defs>
        {/* Kept faint: the wash is orientation, the stroke carries the trend. */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <motion.path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
