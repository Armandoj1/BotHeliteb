import { RefreshCcw } from 'lucide-react';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/components/ui';
import {
  RESOURCE_INDEX_LABELS,
  RESOURCE_INDEX_TONES,
  RESOURCE_KIND_ICONS,
  RESOURCE_KIND_LABELS,
} from '@/features/resources/labels';
import type { IResource } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';
import { formatBytes, formatNumber } from '@/utils/format-number';

export interface IResourcesTableProps {
  resources: readonly IResource[];
  reindexingId: string | null;
  onReindex: (resource: IResource) => void;
}

export function ResourcesTable({ resources, reindexingId, onReindex }: IResourcesTableProps) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recurso</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead align="right">Fragmentos</TableHead>
            <TableHead align="right">Tamaño</TableHead>
            <TableHead>Indexación</TableHead>
            <TableHead>Propietario</TableHead>
            <TableHead align="right">Actualizado</TableHead>
            <TableHead align="right" className="sr-only">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {resources.map((resource) => {
            const Icon = RESOURCE_KIND_ICONS[resource.kind];

            return (
              <TableRow key={resource.id}>
                <TableCell className="max-w-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface-muted text-subtle">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{resource.title}</p>
                      <p className="truncate text-[12px] text-subtle">{resource.description}</p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-muted">{RESOURCE_KIND_LABELS[resource.kind]}</TableCell>

                <TableCell align="right" className="text-muted" data-numeric>
                  {formatNumber(resource.chunks)}
                </TableCell>

                <TableCell align="right" className="text-muted" data-numeric>
                  {formatBytes(resource.size)}
                </TableCell>

                <TableCell>
                  <Badge tone={RESOURCE_INDEX_TONES[resource.indexState]} withDot>
                    {RESOURCE_INDEX_LABELS[resource.indexState]}
                  </Badge>
                </TableCell>

                <TableCell className="text-muted">{resource.owner}</TableCell>

                <TableCell align="right" className="whitespace-nowrap text-subtle">
                  {formatRelativeTime(resource.updatedAt)}
                </TableCell>

                <TableCell align="right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Reindexar ${resource.title}`}
                    isLoading={reindexingId === resource.id}
                    disabled={resource.indexState === 'processing'}
                    onClick={() => onReindex(resource)}
                  >
                    <RefreshCcw aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
