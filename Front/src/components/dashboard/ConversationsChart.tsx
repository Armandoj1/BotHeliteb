import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import {
  AREA_FILL_OPACITY,
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_HEIGHT,
  CHART_PRIMARY,
  CHART_SECONDARY,
} from '@/lib/chart-theme';
import type { ITimeseriesPoint } from '@/types';
import { formatChartDate, formatDate } from '@/utils/format-date';
import { formatCompact } from '@/utils/format-number';
import { ChartTooltip } from './ChartTooltip';

export interface IConversationsChartProps {
  data: readonly ITimeseriesPoint[];
}

export function ConversationsChart({ data }: IConversationsChartProps) {
  return (
    <Card className="p-0">
      <CardHeader>
        <div>
          <CardTitle>Volumen de conversaciones</CardTitle>
          <CardDescription>Últimos 30 días · abiertas frente a resueltas</CardDescription>
        </div>
      </CardHeader>

      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT.default}>
          <AreaChart data={[...data]} margin={{ top: 4, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="date"
              {...CHART_AXIS_PROPS}
              tickFormatter={formatChartDate}
              minTickGap={28}
            />
            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompact} width={44} />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              content={<ChartTooltip labelFormatter={formatDate} />}
            />

            <Area
              type="monotone"
              dataKey="conversations"
              name="Conversaciones"
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              fill={CHART_PRIMARY}
              fillOpacity={AREA_FILL_OPACITY}
            />
            <Area
              type="monotone"
              dataKey="resolved"
              name="Resueltas"
              stroke={CHART_SECONDARY}
              strokeWidth={2}
              fill={CHART_SECONDARY}
              fillOpacity={AREA_FILL_OPACITY}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
