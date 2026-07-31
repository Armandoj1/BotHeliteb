import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import type { IProseOutcome } from '@/services/comparison.service';
import type { ComparisonSlotType, IProseRunState, IProseVerdict, ResultType } from '@/types';
import { buildProseVerdict } from '../utils/verdict';
import { streamText } from '../utils/stream-text';

const IDLE: IProseRunState = { status: 'idle', content: '', metrics: null, error: null };

export interface IProseRunnerState {
  runs: Record<ComparisonSlotType, IProseRunState>;
  verdict: IProseVerdict | null;
  isRunning: boolean;
  run: (prompt: string) => void;
  reset: () => void;
}

/**
 * Shared execution engine for the two "prose" categories (`llm`, `full`): fire
 * one request that returns both slots, reveal each side's real text at its own
 * measured pace, then report what actually happened. Category hooks only
 * differ in *what* they call and *how slots are chosen* — this owns the race,
 * the streaming reveal and the outcome toast so that logic exists once.
 */
export function useProseRunner(
  execute: (prompt: string) => Promise<ResultType<{ a: IProseOutcome; b: IProseOutcome }>>,
): IProseRunnerState {
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const [runs, setRuns] = useState<Record<ComparisonSlotType, IProseRunState>>({ a: IDLE, b: IDLE });

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((slot: ComparisonSlotType, next: Partial<IProseRunState>) => {
    setRuns((current) => ({ ...current, [slot]: { ...current[slot], ...next } }));
  }, []);

  const revealSlot = useCallback(
    async (slot: ComparisonSlotType, outcome: IProseOutcome, signal: AbortSignal) => {
      if (!outcome.ok || !outcome.metrics) {
        patch(slot, { status: 'error', error: outcome.error });
        return;
      }

      patch(slot, { status: 'streaming', metrics: outcome.metrics });
      await streamText(
        outcome.content,
        outcome.metrics.tokensPerSecond,
        (revealed) => patch(slot, { content: revealed }),
        signal,
      );
      if (!signal.aborted) patch(slot, { status: 'done', content: outcome.content });
    },
    [patch],
  );

  const run = useCallback(
    (prompt: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setRuns({
        a: { status: 'pending', content: '', metrics: null, error: null },
        b: { status: 'pending', content: '', metrics: null, error: null },
      });

      void (async () => {
        const result = await execute(prompt);
        if (controller.signal.aborted) return;

        if (!result.ok) {
          setRuns({
            a: { status: 'error', content: '', metrics: null, error: result.error },
            b: { status: 'error', content: '', metrics: null, error: result.error },
          });
          toast.error({ title: 'No se pudo comparar', description: result.error });
          return;
        }

        await Promise.all([
          revealSlot('a', result.value.a, controller.signal),
          revealSlot('b', result.value.b, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        const failures = [result.value.a, result.value.b].filter((side) => !side.ok).length;
        if (failures === 2) {
          toast.error({ title: 'Ningún proveedor respondió', description: 'Revisa el detalle en cada tarjeta.' });
        } else if (failures === 1) {
          toast.warning({ title: 'Solo un proveedor respondió', description: 'La comparación quedó incompleta.' });
        } else {
          toast.success({ title: 'Comparación completada' });
        }
      })();
    },
    [execute, revealSlot, toast],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setRuns({ a: IDLE, b: IDLE });
  }, []);

  const isRunning =
    runs.a.status === 'pending' ||
    runs.a.status === 'streaming' ||
    runs.b.status === 'pending' ||
    runs.b.status === 'streaming';

  return { runs, verdict: buildProseVerdict(runs.a, runs.b), isRunning, run, reset };
}
