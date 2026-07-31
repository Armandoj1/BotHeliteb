import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

import { Avatar, Badge, Card, StatusDot } from '@/components/ui';
import { ADVISOR_STATUS_LABELS, ADVISOR_STATUS_TONES } from '@/features/advisors/labels';
import { staggerItem, TRANSITION } from '@/lib/motion';
import type { IAdvisor } from '@/types';

export interface IAdvisorCardProps {
  advisor: IAdvisor;
}

/** Roster card: quién es, cómo contactarlo y si puede entrar — nada inventado. */
export function AdvisorCard({ advisor }: IAdvisorCardProps) {
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
            <p className="truncate text-[12px] text-subtle">{advisor.phone}</p>
            <p className="mt-0.5 truncate text-[11px] text-subtle">{advisor.email}</p>
          </div>

          <Badge tone={ADVISOR_STATUS_TONES[advisor.status]}>
            {ADVISOR_STATUS_LABELS[advisor.status]}
          </Badge>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {advisor.role === 'admin' ? (
            <Badge tone="primary" className="gap-1">
              <ShieldCheck className="size-3" aria-hidden />
              Administrador
            </Badge>
          ) : (
            <Badge tone="neutral">Asesor</Badge>
          )}
          {!advisor.active ? <Badge tone="danger">Inactivo</Badge> : null}
        </div>
      </Card>
    </motion.div>
  );
}
