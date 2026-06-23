'use server';

import { headers } from 'next/headers';

/**
 * Obtiene la dirección IP del cliente de forma segura desde los encabezados del servidor.
 * No depende de servicios externos.
 */
export async function getClientIp(): Promise<string> {
  const headerList = headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  
  if (forwardedFor) {
    // x-forwarded-for puede contener una lista de IPs si hay varios proxies. 
    // La primera suele ser la del cliente original.
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback si no está detrás de un proxy (poco común en producción Vercel/Cloud)
  return '127.0.0.1';
}
