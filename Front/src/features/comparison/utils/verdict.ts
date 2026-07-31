import type {
  ComparisonWinnerType,
  IProseRunState,
  IProseVerdict,
  ISemanticRunState,
  ISemanticVerdict,
} from '@/types';

/** Below this relative gap the two runs are reported as equivalent. */
const TIE_THRESHOLD = 0.05;

function pickLower(a: number, b: number): ComparisonWinnerType {
  const largest = Math.max(a, b);
  if (largest === 0) return 'tie';
  if (Math.abs(a - b) / largest < TIE_THRESHOLD) return 'tie';
  return a < b ? 'a' : 'b';
}

function pickHigher(a: number, b: number): ComparisonWinnerType {
  const winner = pickLower(a, b);
  if (winner === 'tie') return 'tie';
  return winner === 'a' ? 'b' : 'a';
}

/**
 * Ranks two finished prose runs (categories `llm` and `full`). Returns `null`
 * while either is still streaming, so the UI never declares a winner before
 * both have crossed the line.
 *
 * "Better" here means measurable — faster, shorter. Answer quality is a
 * judgement the operator makes by reading, and the UI does not fake it. Cost
 * only enters the verdict when both sides actually report it.
 */
export function buildProseVerdict(a: IProseRunState, b: IProseRunState): IProseVerdict | null {
  if (a.status !== 'done' || b.status !== 'done' || !a.metrics || !b.metrics) return null;

  return {
    fastest: pickLower(a.metrics.totalMs, b.metrics.totalMs),
    mostConcise: pickLower(a.metrics.outputTokens, b.metrics.outputTokens),
    cheapest:
      a.metrics.costUsd === null || b.metrics.costUsd === null
        ? null
        : pickLower(a.metrics.costUsd, b.metrics.costUsd),
  };
}

/**
 * Ranks two finished semantic-search runs (category `embedding`). Never ranks
 * match quality — cosine distance is shown per result for the operator to read,
 * not re-scored into a synthetic "better" that the data does not support.
 */
export function buildSemanticVerdict(
  a: ISemanticRunState,
  b: ISemanticRunState,
): ISemanticVerdict | null {
  if (a.status !== 'done' || b.status !== 'done' || a.elapsedMs === null || b.elapsedMs === null) {
    return null;
  }

  return {
    fastest: pickLower(a.elapsedMs, b.elapsedMs),
    mostMatches: pickHigher(a.matches.length, b.matches.length),
  };
}
