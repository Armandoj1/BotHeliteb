import { motion } from 'framer-motion';
import { Gauge, ListOrdered } from 'lucide-react';

import { Card } from '@/components/ui';
import { fadeInUp } from '@/lib/motion';
import type { ComparisonWinnerType, ISemanticRunState, ISemanticVerdict } from '@/types';
import { formatNumber } from '@/utils/format-number';

export interface ISemanticVerdictBarProps {
  verdict: ISemanticVerdict;
  runs: { ollama: ISemanticRunState; gemini: ISemanticRunState };
}

/** Ranks speed and result count — never match quality, which distance alone cannot prove. */
export function SemanticVerdictBar({ verdict, runs }: ISemanticVerdictBarProps) {
  const nameOf = (winner: ComparisonWinnerType) => {
    if (winner === 'tie') return 'Empate técnico';
    return winner === 'a' ? 'Ollama' : 'Gemini';
  };

  const rows = [
    {
      icon: Gauge,
      label: 'Más rápido',
      winner: verdict.fastest,
      detail:
        verdict.fastest === 'tie'
          ? `${formatNumber(runs.ollama.elapsedMs ?? 0)} ms vs ${formatNumber(runs.gemini.elapsedMs ?? 0)} ms`
          : `${formatNumber((verdict.fastest === 'a' ? runs.ollama : runs.gemini).elapsedMs ?? 0)} ms`,
    },
    {
      icon: ListOrdered,
      label: 'Más resultados',
      winner: verdict.mostMatches,
      detail:
        verdict.mostMatches === 'tie'
          ? `${runs.ollama.matches.length} vs ${runs.gemini.matches.length}`
          : `${(verdict.mostMatches === 'a' ? runs.ollama : runs.gemini).matches.length} productos`,
    },
  ];

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Card className="grid gap-px overflow-hidden bg-border sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, winner, detail }) => (
          <div key={label} className="bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-subtle">
              <Icon className="size-3.5" aria-hidden />
              {label}
            </p>
            <p className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {nameOf(winner)}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted" data-numeric>
              {detail}
            </p>
          </div>
        ))}
      </Card>
    </motion.div>
  );
}
