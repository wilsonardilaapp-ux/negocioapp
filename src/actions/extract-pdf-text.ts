'use server';

import pdf from 'pdf-parse';

/**
 * Recibe un Data URI (base64) de un PDF y devuelve su contenido en texto plano.
 */
export async function extractTextFromPDF(dataUri: string): Promise<string> {
  try {
    // 1. Limpiar el Data URI para obtener solo la parte base64
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('Formato de archivo inválido.');
    }

    // 2. Convertir base64 a Buffer (binario)
    const dataBuffer = Buffer.from(base64Data, 'base64');

    // 3. Usar pdf-parse para extraer el texto
    const data = await pdf(dataBuffer);

    // 4. Limpiar un poco el texto (quitar espacios excesivos)
    const cleanText = data.text
      .replace(/\n\s*\n/g, '\n') // Quitar saltos de línea múltiples
      .trim();

    return cleanText;

  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error('No se pudo leer el contenido del PDF. Asegúrate de que no sea una imagen escaneada.');
  }
}
