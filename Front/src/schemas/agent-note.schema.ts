import { z } from 'zod';

export const agentNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: 'El título debe tener al menos 3 caracteres.' })
    .max(80, { message: 'El título no puede superar los 80 caracteres.' }),
  content: z
    .string()
    .trim()
    .min(20, { message: 'Describe la instrucción con al menos 20 caracteres.' })
    .max(1200, { message: 'La instrucción no puede superar los 1200 caracteres.' }),
  scope: z.enum(['global', 'channel', 'product', 'customer']),
  channel: z.enum(['whatsapp', 'escritorio']).nullable().optional(),
  status: z.enum(['published', 'draft']),
  /** Lower numbers are injected earlier into the system prompt. */
  priority: z.coerce
    .number()
    .int({ message: 'La prioridad debe ser un número entero.' })
    .min(1, { message: 'La prioridad mínima es 1.' })
    .max(99, { message: 'La prioridad máxima es 99.' }),
}).superRefine((valores, ctx) => {
  // Alcance "Por canal" sin canal elegido dejaria la nota aplicando a todos,
  // que es justo lo contrario de lo que quiso quien la escribio.
  if (valores.scope === 'channel' && !valores.channel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['channel'],
      message: 'Elige a qué canal aplica la nota.',
    });
  }
});

export type AgentNoteFormType = z.infer<typeof agentNoteSchema>;
