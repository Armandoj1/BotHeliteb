import { z } from 'zod';

export const comparisonPromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(4, { message: 'Escribe al menos 4 caracteres para poder comparar.' })
    .max(4000, { message: 'El mensaje no puede superar los 4000 caracteres.' }),
});

export type ComparisonPromptFormType = z.infer<typeof comparisonPromptSchema>;
