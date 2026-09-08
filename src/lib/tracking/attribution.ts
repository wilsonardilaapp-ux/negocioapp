/**
 * @fileOverview Helper para la gestión de atribución de marketing (Last-Click).
 * Persiste el origen de la visita para asegurar la trazabilidad en el cierre de la venta.
 */

const ATTRIBUTION_KEY = 'markix_attribution_ref';

/**
 * Guarda el canal de referencia en el almacenamiento local.
 * Implementa el modelo Last-Click: el último origen detectado sobreescribe al anterior.
 */
export function saveAttribution(ref: string | null): void {
  if (typeof window === 'undefined' || !ref) return;
  
  try {
    const cleanRef = ref.trim().toLowerCase();
    if (cleanRef) {
      localStorage.setItem(ATTRIBUTION_KEY, cleanRef);
    }
  } catch (e) {
    console.warn('[Attribution] Failed to save ref:', e);
  }
}

/**
 * Recupera el canal de atribución guardado o el valor por defecto.
 */
export function getAttribution(): string {
  if (typeof window === 'undefined') return 'web';
  
  try {
    return localStorage.getItem(ATTRIBUTION_KEY) || 'web';
  } catch (e) {
    return 'web';
  }
}
