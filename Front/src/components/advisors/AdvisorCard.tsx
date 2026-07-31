import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

import { Avatar, Badge, Card, StatusDot } from '@/components/ui';
import { ADVISOR_STATUS_LABELS, ADVISOR_STATUS_TONES, describeWorkload } from '@/features/advisors/labels';
import { staggerItem, TRANSITION } from '@/lib/motion';
import type { IAdvisor } from '@/types';
import { formatDuration } from '@/utils/format-number';

export interface IAdvisorCardProps {
  advisor: IAdvisor;
}

export function AdvisorCard({ advisor }: IAdvisorCardProps) {
  const workload = describeWorkload(advisor.activeConversations);

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -2 }} transition={TRANSITION.fast}>
      <Card interactive className="h-full p-5">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar name={advisor.name} initials={advisor.initials} size="lg" />
            <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-surface p-0.5">
              <StatusDot
                tone={ADVISOR_STATUS_TONES[advisor.status]}
                pulse={advisor.status === 'online'}
              />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-foreground">{advisor.name}</p>
            <p className="truncate text-[12px] text-subtle">{advisor.role}</p>
            <p className="mt-0.5 truncate text-[11px] text-subtle">{advisor.email}</p>
          </div>

          <Badge tone={ADVISOR_STATUS_TONES[advisor.status]}>
            {ADVISOR_STATUS_LABELS[advisor.status]}
          </Badge>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface-sunken/60 p-3 text-center">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-subtle">Activas</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-foreground" data-numeric>
              {advisor.activeConversations}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-subtle">Resueltas</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-foreground" data-numeric>
              {advisor.resolvedToday}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-subtle">1ª respuesta</dt>
            <dd className="mt-0.5 text-[15px] font-semibold text-foreground" data-numeric>
              {advisor.avgResponseTime === 0 ? '—' : formatDuration(advisor.avgResponseTime * 1000)}
            </dd>
          </div>
        </dl>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={workload.tone}>Carga {workload.label.toLowerCase()}</Badge>
          <Badge tone="outline" className="gap-1">
            <Star className="size-3" aria-hidden />
            <span data-numeric>{advisor.satisfaction.toFixed(1)}</span>
          </Badge>
          {advisor.specialties.map((specialty) => (
            <Badge key={specialty} tone="neutral">
              {specialty}
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
