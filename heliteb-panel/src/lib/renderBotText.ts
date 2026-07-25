import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * El bot formatea sus respuestas en estilo WhatsApp (*negrita* con UN solo asterisco,
 * nunca **doble** - ver WhatsAppFormatNormalizer.cs en el backend), pero `marked`
 * interpreta *texto* como cursiva (markdown estandar). Se convierte a **doble**
 * antes de parsear para que se vea en negrita, como el bot realmente quiso decir.
 */
export function renderBotText(text: string): string {
  const converted = text.replace(/\*([^*\n]+)\*/g, '**$1**');
  const html = marked.parse(converted, { breaks: true, async: false }) as string;
  return DOMPurify.sanitize(html);
}
