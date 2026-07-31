import { z } from 'zod';

export const workspaceSettingsSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
    .max(60, { message: 'El nombre no puede superar los 60 caracteres.' }),
  supportEmail: z.string().trim().email({ message: 'Introduce un correo electrónico válido.' }),
  timezone: z.string().min(1, { message: 'Selecciona una zona horaria.' }),
  locale: z.string().min(1, { message: 'Selecciona un idioma.' }),
  /** Minutes of inactivity before a conversation is auto-closed. */
  autoCloseMinutes: z.coerce
    .number()
    .int({ message: 'Debe ser un número entero de minutos.' })
    .min(5, { message: 'El mínimo es 5 minutos.' })
    .max(1440, { message: 'El máximo es 1440 minutos (24 horas).' }),
});

export type WorkspaceSettingsFormType = z.infer<typeof workspaceSettingsSchema>;

export const assistantSettingsSchema = z.object({
  /** 0–2 in the OpenAI-style scale; kept as a string for the select control. */
  temperature: z.string().min(1, { message: 'Selecciona un nivel de creatividad.' }),
  maxTokens: z.coerce
    .number()
    .int({ message: 'Debe ser un número entero.' })
    .min(256, { message: 'El mínimo razonable es 256 tokens.' })
    .max(32_000, { message: 'El máximo permitido es 32 000 tokens.' }),
  fallbackProvider: z.string().min(1, { message: 'Selecciona un proveedor de respaldo.' }),
  systemPrompt: z
    .string()
    .trim()
    .min(30, { message: 'El prompt base debe tener al menos 30 caracteres.' })
    .max(4000, { message: 'El prompt base no puede superar los 4000 caracteres.' }),
  escalateOnNegativeSentiment: z.boolean(),
  citeSources: z.boolean(),
});

export type AssistantSettingsFormType = z.infer<typeof assistantSettingsSchema>;

export const notificationSettingsSchema = z.object({
  emailDigest: z.boolean(),
  escalationAlerts: z.boolean(),
  syncFailures: z.boolean(),
  quotaWarnings: z.boolean(),
  weeklyReport: z.boolean(),
});

export type NotificationSettingsFormType = z.infer<typeof notificationSettingsSchema>;
