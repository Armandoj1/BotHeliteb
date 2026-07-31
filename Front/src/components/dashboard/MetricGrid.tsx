import { motion } from 'framer-motion';

import { staggerContainer } from '@/lib/motion';
import type { IMetric } from '@/types';
import { MetricCard } from './MetricCard';

export interface IMetricGridProps {
  metrics: readonly IMetric[];
}

export function MetricGrid({ metrics }: IMetricGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </motion.div>
  );
}
