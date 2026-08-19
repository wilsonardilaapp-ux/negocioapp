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
 * Elimina mayúsculas, acentos, espacios y caracteres especiales.
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
 * Elimina caracteres no numéricos y antepone "57" (Colombia) si el número tiene 10 dígitos.
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  // Eliminar todo lo que no sea dígito
  const digits = phone.replace(/\D/g, '');
  
  // Si tiene 10 dígitos (formato local colombiano), anteponer 57
  if (digits.length === 10) {
    return '57' + digits;
  }
  
  return digits;
}

/**
 * Formatea una fecha string (YYYY-MM-DD) a un formato legible en español.
 * Ej: "2026-08-21" -> "viernes, 21 de agosto"
 */
export function formatReservationDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    // Forzamos la interpretación local añadiendo la hora para evitar desfases UTC
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  } catch (e) {
    return dateStr || "";
  }
}
