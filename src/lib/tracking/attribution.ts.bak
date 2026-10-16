// Helper de Atribución Last-Click para Markix (Blindado)
export const ALLOWED_CHANNELS = ['web', 'whatsapp', 'redes', 'landing', 'qr', 'blog'] as const;
export type AllowedChannel = (typeof ALLOWED_CHANNELS)[number];

const STORAGE_KEY = 'markix_attribution_channel';

/**
 * Guarda el canal de origen en localStorage si pertenece a la lista blanca oficial.
 */
export function saveAttribution(ref: string | null | undefined): void {
  if (typeof window === 'undefined' || !ref) return;
  try {
    const clean = ref.toLowerCase().trim();
    if ((ALLOWED_CHANNELS as readonly string[]).includes(clean)) {
      localStorage.setItem(STORAGE_KEY, clean);
    }
  } catch {
    // Modo incógnito o storage bloqueado: no interrumpe el flujo
  }
}

/**
 * Recupera el canal de origen almacenado con fallback garantizado a 'web'.
 */
export function getAttribution(): string {
  if (typeof window === 'undefined') return 'web';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && (ALLOWED_CHANNELS as readonly string[]).includes(val)) {
      return val;
    }
  } catch {
    // Fallback silencioso
  }
  return 'web';
}
