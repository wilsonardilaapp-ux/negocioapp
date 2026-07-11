/**
 * Transforma una secure_url de Cloudinary en un ícono cuadrado PNG,
 * insertando parámetros de transformación en la URL (sin descargar
 * ni procesar la imagen en nuestro servidor). Agrega un query param
 * de versión basado en updatedAt para forzar cache-busting cuando
 * el negocio cambia su logo.
 */
export function buildFaviconUrl(
  business: Record<string, any> | null,
  size: number = 32,
  fallback: string = "/favicon.ico"
): string {
  const sourceUrl: string | undefined = business?.faviconUrl || business?.logoURL;
  if (!sourceUrl) return fallback;

  const marker = "/upload/";
  const idx = sourceUrl.indexOf(marker);
  if (idx === -1) {
    // No es una URL de Cloudinary reconocible: usarla tal cual, sin transformar.
    return sourceUrl;
  }

  const before = sourceUrl.slice(0, idx + marker.length);
  const after = sourceUrl.slice(idx + marker.length);
  const transformed = `${before}w_${size},h_${size},c_fill,f_png,q_auto/${after}`;

  const version =
    business?.updatedAt?._seconds ??
    business?.updatedAt?.seconds ??
    business?.updatedAt ??
    "0";

  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}v=${version}`;
}
