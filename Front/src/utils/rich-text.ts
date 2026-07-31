/**
 * Removes WhatsApp bold markers from text rendered as a single truncated line.
 *
 * Previews (inbox rows, notification bodies) cannot show emphasis, so the
 * asterisks would read as stray punctuation rather than formatting.
 */
export function stripBold(text: string): string {
  return text.replace(/\*([^*\n]+)\*/g, '$1');
}
