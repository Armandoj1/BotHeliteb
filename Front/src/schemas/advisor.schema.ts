import { z } from 'zod';

export const createAdvisorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { message: 'Escribe el nombre del asesor.' })
    .max(200, { message: 'Máximo 200 caracteres.' }),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Escribe un correo.' })
    .email({ message: 'Ese correo no tiene un formato válido.' }),
  telefono: z
    .string()
    .trim()
    .min(7, { message: 'Escribe un teléfono válido, con indicativo de país.' })
    .max(20, { message: 'Máximo 20 caracteres.' }),
});

export type CreateAdvisorFormType = z.infer<typeof createAdvisorSchema>;
