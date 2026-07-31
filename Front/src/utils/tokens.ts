/**
 * Rough token estimate for cost previews.
 *
 * Real tokenisers are model-specific and belong on the server; ~4 characters
 * per token is the standard back-of-envelope for Latin scripts and is accurate
 * enough to compare two models against the same input.
 */
export const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.trim().length / CHARS_PER_TOKEN));
}
