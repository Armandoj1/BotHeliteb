import { z } from 'zod';

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: 'Escribe un mensaje antes de enviarlo.' })
    .max(2000, { message: 'El mensaje no puede superar los 2000 caracteres.' }),
});

export type MessageFormType = z.infer<typeof messageSchema>;
