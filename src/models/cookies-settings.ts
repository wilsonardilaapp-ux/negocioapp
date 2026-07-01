import { z } from 'zod';

/**
 * Esquema de validación para la configuración del banner de cookies.
 */
export const CookiesSettingsSchema = z.object({
  enabled: z.boolean(),
  title: z.string().min(1, "El título es requerido."),
  message: z.string().min(1, "El mensaje es requerido."),
  buttonText: z.string().min(1, "El texto del botón es requerido."),
  position: z.enum(['top', 'bottom']),
  updatedAt: z.any().optional(),
});

/**
 * Tipo inferido para TypeScript.
 */
export type CookiesSettings = z.infer<typeof CookiesSettingsSchema>;
