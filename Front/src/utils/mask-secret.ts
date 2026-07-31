/**
 * Secrets are never rendered in full unless the user explicitly reveals them.
 * Keeps a short prefix/suffix so a key is still recognisable at a glance.
 */
export function maskSecret(value: string, visibleStart = 6, visibleEnd = 4): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= visibleStart + visibleEnd) return '•'.repeat(trimmed.length);

  const start = trimmed.slice(0, visibleStart);
  const end = trimmed.slice(-visibleEnd);
  const masked = '•'.repeat(Math.min(trimmed.length - visibleStart - visibleEnd, 16));

  return `${start}${masked}${end}`;
}
