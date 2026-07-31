import type { IApiMetrics } from '@/api/contracts';
import { ENDPOINTS } from '@/api/endpoints';
import { httpClient } from '@/api/http-client';
import type {
  IActivityEntry,
  IChannelBreakdown,
  IMetric,
  ITimeseriesPoint,
  ITokenUsagePoint,
  ResultType,
} from '@/types';
import { isApiConfigured } from './transport';

export interface IDashboardSnapshot {
  metrics: IMetric[];
  timeseries: ITimeseriesPoint[];
  tokenUsage: ITokenUsagePoint[];
  channels: IChannelBreakdown[];
  activity: IActivityEntry[];
}

/**
 * `GET /api/metrics` returns three live counters and nothing else — there is no
 * timeseries, channel breakdown or activity feed upstream.
 *
 * So against a real API the dashboard shows those three counters and leaves the
 * chart series empty, rather than padding a real screen with invented history.
 * The fixtures only come back when running without a backend.
 */
export async function fetchDashboardSnapshot(): Promise<ResultType<IDashboardSnapshot>> {
  if (!isApiConfigured()) {
    return { ok: false, error: 'Configura PUBLIC_API_URL para ver las métricas del panel.' };
  }

  const result = await httpClient.get<IApiMetrics>(ENDPOINTS.dashboard.metrics);
  if (!result.ok) return result;

  const { productos, cotizaciones, asesores } = result.value;

  return {
    ok: true,
    value: {
      metrics: [
        buildMetric('productos', 'Productos activos', productos, 'En el catálogo sincronizado'),
        buildMetric('cotizaciones', 'Cotizaciones', cotizaciones, 'Emitidas históricamente'),
        buildMetric('asesores', 'Asesores activos', asesores, 'Con acceso al panel'),
      ],
      timeseries: [],
      tokenUsage: [],
      channels: [],
      activity: [],
    },
  };
}

/**
 * The API reports a point-in-time count with no history, so there is no delta to
 * show and no sparkline to draw: both are reported as flat instead of faked.
 */
function buildMetric(id: string, label: string, value: number, helper: string): IMetric {
  return {
    id,
    label,
    value,
    format: 'number',
    delta: 0,
    direction: 'flat',
    helper,
    series: [],
  };
}
