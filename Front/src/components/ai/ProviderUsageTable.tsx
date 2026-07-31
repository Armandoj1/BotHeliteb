import { ChartNoAxesColumn } from 'lucide-react';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui';
import { getProviderDefinition } from '@/features/ai/config';
import type { IProviderUsage } from '@/types';
import { formatCompact, formatCurrency, formatPercent } from '@/utils/format-number';
import { ProviderLogo } from './ProviderLogo';

export interface IProviderUsageTableProps {
  usage: readonly IProviderUsage[];
}

export function ProviderUsageTable({ usage }: IProviderUsageTableProps) {
  return (
    <Card elevation="raised" className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Consumo por proveedor</CardTitle>
          <CardDescription>
            Distribución del tráfico y costo estimado del ciclo de facturación actual.
          </CardDescription>
        </div>
      </CardHeader>

      {usage.length === 0 ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title="Todavía no hay consumo"
          description="En cuanto el asistente procese su primera solicitud verás aquí el desglose por proveedor."
        />
      ) : (
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead align="right">Solicitudes</TableHead>
                <TableHead align="right">Tokens entrada</TableHead>
                <TableHead align="right">Tokens salida</TableHead>
                <TableHead align="right">Costo</TableHead>
                <TableHead className="w-40">Participación</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {usage.map((item) => {
                const definition = getProviderDefinition(item.providerId);

                return (
                  <TableRow key={item.providerId} interactive>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <ProviderLogo definition={definition} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{definition.name}</p>
                          <p className="truncate text-[12px] text-subtle">{definition.vendor}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell align="right" data-numeric>
                      {formatCompact(item.requests)}
                    </TableCell>
                    <TableCell align="right" data-numeric>
                      {formatCompact(item.inputTokens)}
                    </TableCell>
                    <TableCell align="right" data-numeric>
                      {formatCompact(item.outputTokens)}
                    </TableCell>
                    <TableCell align="right" data-numeric>
                      {item.estimatedCost === 0 ? '—' : formatCurrency(item.estimatedCost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Progress
                          value={item.share * 100}
                          label={`Participación de ${definition.name}`}
                          className="flex-1"
                        />
                        <span className="w-10 shrink-0 text-right text-[12px] text-muted" data-numeric>
                          {formatPercent(item.share * 100, 0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      )}
    </Card>
  );
}
