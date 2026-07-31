import { motion } from 'framer-motion';
import { Clock, RefreshCcw } from 'lucide-react';

import { Alert, Badge, Button, Card, Progress, StatusDot } from '@/components/ui';
import {
  SYNC_FREQUENCY_LABELS,
  SYNC_STATE_LABELS,
  SYNC_STATE_TONES,
} from '@/features/sync/labels';
import { staggerItem } from '@/lib/motion';
import type { ISyncSource } from '@/types';
import { formatRelativeTime } from '@/utils/format-date';
import { formatNumber } from '@/utils/format-number';

export interface ISyncSourceCardProps {
  source: ISyncSource;
  isTriggering: boolean;
  onRun: (source: ISyncSource) => void;
}

export function SyncSourceCard({ source, isTriggering, onRun }: ISyncSourceCardProps) {
  const tone = SYNC_STATE_TONES[source.state];

  return (
    <motion.div variants={staggerItem} className="h-full">
      <Card className="flex h-full flex-col p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusDot tone={tone} pulse={source.state === 'syncing'} />
              <h3 className="truncate text-[14px] font-semibold text-foreground">{source.name}</h3>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-subtle">{source.vendor}</p>
          </div>

          <Badge tone={tone}>{SYNC_STATE_LABELS[source.state]}</Badge>
        </header>

        <p className="mt-3 text-[13px] leading-relaxed text-muted">{source.description}</p>

        {source.state === 'syncing' ? (
          <div className="mt-4">
            <Progress value={source.progress} label={`Progreso de ${source.name}`} />
            <p className="mt-1.5 text-[11px] text-subtle" data-numeric>
              {source.progress}% completado
            </p>
          </div>
        ) : null}

        {source.errorMessage ? (
          <Alert
            tone={source.state === 'failed' ? 'danger' : 'warning'}
            title={source.errorMessage}
            className="mt-4"
          />
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-[12px]">
          <div>
            <dt className="text-subtle">Frecuencia</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-foreground">
              <Clock className="size-3.5 text-subtle" aria-hidden />
              {SYNC_FREQUENCY_LABELS[source.frequency]}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Registros</dt>
            <dd className="mt-0.5 text-foreground" data-numeric>
              {formatNumber(source.recordsSynced)}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Última ejecución</dt>
            <dd className="mt-0.5 text-muted">
              {source.lastRunAt ? formatRelativeTime(source.lastRunAt) : 'Nunca'}
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Próxima</dt>
            <dd className="mt-0.5 text-muted">
              {source.nextRunAt ? formatRelativeTime(source.nextRunAt) : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isTriggering}
            disabled={source.state === 'syncing'}
            leftIcon={<RefreshCcw aria-hidden />}
            onClick={() => onRun(source)}
          >
            Sincronizar ahora
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
