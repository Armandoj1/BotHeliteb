import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui';
import { SYNC_OUTCOME_LABELS, SYNC_OUTCOME_TONES } from '@/features/sync/labels';
import type { ISyncRun } from '@/types';
import { formatDateTime } from '@/utils/format-date';
import { formatDuration, formatNumber } from '@/utils/format-number';

export interface ISyncRunsTableProps {
  runs: readonly ISyncRun[];
}

export function SyncRunsTable({ runs }: ISyncRunsTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <CardHeader>
        <div>
          <CardTitle>Historial de ejecuciones</CardTitle>
          <CardDescription>Últimas sincronizaciones de todos los orígenes.</CardDescription>
        </div>
      </CardHeader>

      <TableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origen</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead align="right">Registros</TableHead>
              <TableHead align="right">Duración</TableHead>
              <TableHead align="right">Inicio</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium text-foreground">{run.sourceName}</TableCell>
                <TableCell>
                  <Badge tone={SYNC_OUTCOME_TONES[run.outcome]} withDot>
                    {SYNC_OUTCOME_LABELS[run.outcome]}
                  </Badge>
                </TableCell>
                <TableCell align="right" className="text-muted" data-numeric>
                  {formatNumber(run.records)}
                </TableCell>
                <TableCell align="right" className="text-muted" data-numeric>
                  {formatDuration(run.durationMs)}
                </TableCell>
                <TableCell align="right" className="whitespace-nowrap text-subtle">
                  {formatDateTime(run.startedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </Card>
  );
}
