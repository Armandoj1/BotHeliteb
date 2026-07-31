import { Sparkles } from 'lucide-react';

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
  Tooltip,
} from '@/components/ui';
import { QUOTATION_STATUS_LABELS, QUOTATION_STATUS_TONES } from '@/features/quotations/labels';
import type { IQuotation } from '@/types';
import { formatDate } from '@/utils/format-date';
import { formatCurrency, formatNumber } from '@/utils/format-number';

export interface IQuotationsTableProps {
  quotations: readonly IQuotation[];
}

export function QuotationsTable({ quotations }: IQuotationsTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referencia</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead align="right">Partidas</TableHead>
            <TableHead align="right">Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Asesor</TableHead>
            <TableHead align="right">Vigencia</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {quotations.map((quotation) => (
            <TableRow key={quotation.id} interactive>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">{quotation.reference}</span>
                  {quotation.generatedByAi ? (
                    <Tooltip content="Borrador generado por el asistente" side="top">
                      <span className="inline-flex">
                        <Sparkles className="size-3.5 text-primary" aria-label="Generada por IA" />
                      </span>
                    </Tooltip>
                  ) : null}
                </span>
                <p className="text-[11px] text-subtle">{formatDate(quotation.issuedAt)}</p>
              </TableCell>

              <TableCell className="max-w-xs">
                <p className="truncate text-foreground">{quotation.customerName}</p>
                <p className="truncate text-[12px] text-subtle">{quotation.customerCompany}</p>
              </TableCell>

              <TableCell align="right" className="text-muted" data-numeric>
                {formatNumber(quotation.lines.length)}
              </TableCell>

              <TableCell align="right" className="font-medium" data-numeric>
                {formatCurrency(quotation.total, quotation.currency)}
              </TableCell>

              <TableCell>
                <Badge tone={QUOTATION_STATUS_TONES[quotation.status]} withDot>
                  {QUOTATION_STATUS_LABELS[quotation.status]}
                </Badge>
              </TableCell>

              <TableCell className="text-muted">{quotation.advisor}</TableCell>

              <TableCell align="right" className="whitespace-nowrap text-subtle">
                {formatDate(quotation.validUntil)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
