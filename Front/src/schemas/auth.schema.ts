import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Introduce tu correo corporativo.' })
    .email({ message: 'Ese correo no tiene un formato válido.' }),
  password: z
    .string()
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
    .max(72, { message: 'La contraseña no puede superar los 72 caracteres.' }),
  /** Extends the simulated session from 8 hours to 30 days. */
  remember: z.boolean(),
});

export type LoginFormType = z.infer<typeof loginSchema>;
