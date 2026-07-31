import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import {
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_HEIGHT,
  CHART_PRIMARY,
  CHART_SECONDARY,
  STACK_GAP_PROPS,
} from '@/lib/chart-theme';
import type { ITokenUsagePoint } from '@/types';
import { formatChartDate, formatDate } from '@/utils/format-date';
import { formatCompact } from '@/utils/format-number';
import { ChartTooltip } from './ChartTooltip';

export interface ITokenUsageChartProps {
  data: readonly ITokenUsagePoint[];
}

export function TokenUsageChart({ data }: ITokenUsageChartProps) {
  return (
    <Card className="p-0">
      <CardHeader>
        <div>
          <CardTitle>Tokens procesados</CardTitle>
          <CardDescription>Últimos 14 días · entrada frente a salida</CardDescription>
        </div>
      </CardHeader>

      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT.default}>
          <BarChart data={[...data]} margin={{ top: 4, right: 12, bottom: 0, left: -8 }} barGap={2}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="date"
              {...CHART_AXIS_PROPS}
              tickFormatter={formatChartDate}
              minTickGap={20}
            />
            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompact} width={44} />
            <Tooltip
              cursor={{ fill: 'color-mix(in srgb, var(--foreground) 5%, transparent)' }}
              content={<ChartTooltip labelFormatter={formatDate} />}
            />

            <Bar
              dataKey="input"
              name="Entrada"
              stackId="tokens"
              fill={CHART_PRIMARY}
              maxBarSize={22}
              {...STACK_GAP_PROPS}
            />
            <Bar
              dataKey="output"
              name="Salida"
              stackId="tokens"
              fill={CHART_SECONDARY}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              {...STACK_GAP_PROPS}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
