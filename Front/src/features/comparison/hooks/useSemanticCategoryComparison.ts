import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { runSemanticComparison } from '@/services/comparison.service';
import type { ISemanticRunState, ISemanticVerdict } from '@/types';
import { buildSemanticVerdict } from '../utils/verdict';

const IDLE: ISemanticRunState = { status: 'idle', matches: [], elapsedMs: null, error: null };

export interface ISemanticCategoryState {
  runs: { ollama: ISemanticRunState; gemini: ISemanticRunState };
  verdict: ISemanticVerdict | null;
  isRunning: boolean;
  run: (query: string) => void;
  reset: () => void;
}

/**
 * Category "Embeddings": how well each provider's vectors rank the catalogue
 * for the same query. No provider picker — the backend always runs Ollama
 * against Gemini in one call, since that is the entire embedding axis today.
 */
export function useSemanticCategoryComparison(): ISemanticCategoryState {
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const [runs, setRuns] = useState<{ ollama: ISemanticRunState; gemini: ISemanticRunState }>({
    ollama: IDLE,
    gemini: IDLE,
  });

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    (query: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setRuns({
        ollama: { status: 'pending', matches: [], elapsedMs: null, error: null },
        gemini: { status: 'pending', matches: [], elapsedMs: null, error: null },
      });

      void (async () => {
        const result = await runSemanticComparison(query);
        if (controller.signal.aborted) return;

        if (!result.ok) {
          const failed: ISemanticRunState = { status: 'error', matches: [], elapsedMs: null, error: result.error };
          setRuns({ ollama: failed, gemini: failed });
          toast.error({ title: 'No se pudo comparar', description: result.error });
          return;
        }

        const toState = (side: typeof result.value.ollama): ISemanticRunState => ({
          status: side.ok ? 'done' : 'error',
          matches: side.matches,
          elapsedMs: side.elapsedMs,
          error: side.error,
        });

        setRuns({ ollama: toState(result.value.ollama), gemini: toState(result.value.gemini) });

        const failures = [result.value.ollama, result.value.gemini].filter((side) => !side.ok).length;
        if (failures === 2) {
          toast.error({ title: 'Ningún proveedor respondió', description: 'Revisa el detalle en cada tarjeta.' });
        } else if (failures === 1) {
          toast.warning({ title: 'Solo un proveedor respondió', description: 'La comparación quedó incompleta.' });
        } else {
          toast.success({ title: 'Búsqueda completada' });
        }
      })();
    },
    [toast],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setRuns({ ollama: IDLE, gemini: IDLE });
  }, []);

  const isRunning = runs.ollama.status === 'pending' || runs.gemini.status === 'pending';

  return { runs, verdict: buildSemanticVerdict(runs.ollama, runs.gemini), isRunning, run, reset };
}
