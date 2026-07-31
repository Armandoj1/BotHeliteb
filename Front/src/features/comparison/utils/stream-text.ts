import { CHARS_PER_TOKEN } from '@/utils/tokens';

const TICK_MS = 40;

/**
 * Reveals `text` at the model's own throughput.
 *
 * Streaming is what makes a side-by-side comparison legible: the slot that
 * finishes first has visibly won, without the user reading a single number.
 * Resolves when the text is fully revealed or the signal aborts.
 */
export function streamText(
  text: string,
  tokensPerSecond: number,
  onChunk: (revealed: string) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const charsPerTick = Math.max(
      1,
      Math.round((tokensPerSecond * CHARS_PER_TOKEN * TICK_MS) / 1000),
    );
    let revealed = 0;

    const finish = () => {
      clearInterval(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };

    const timer = setInterval(() => {
      revealed = Math.min(text.length, revealed + charsPerTick);
      onChunk(text.slice(0, revealed));
      if (revealed >= text.length) finish();
    }, TICK_MS);

    signal.addEventListener('abort', finish);
  });
}
