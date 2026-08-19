import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripHtml(html: string): string {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Normaliza un identificador de módulo para asegurar consistencia en comparaciones y DB.
 */
export function normalizeModuleId(id: string | undefined | null): string {
  if (!id) return "";
  return id
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Normaliza un número de teléfono al formato internacional (código de país + número).
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return '57' + digits;
  }
  return digits;
}

/**
 * Formatea una fecha string (YYYY-MM-DD) a un formato legible en español.
 * Evita el desfase UTC parseando los componentes de la fecha manualmente.
 */
export function formatReservationDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    // Dividimos el string para evitar que el constructor Date aplique desfase UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    // month - 1 porque en JS los meses van de 0 a 11
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return dateStr;
    
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  } catch (e) {
    console.error("[formatReservationDate] Error:", e);
    return dateStr || "";
  }
}
