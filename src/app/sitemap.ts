
import { MetadataRoute } from 'next';
import { getAdminFirestore } from '@/firebase/server-init';
import { DIRECTORY_CATEGORIES, type BusinessDirectoryEntry } from '@/models/business-directory';

/**
 * Genera el sitemap dinámico de la aplicación, incluyendo todas las rutas
 * del directorio de negocios para optimizar el rastreo de Google.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zentry.com'; // Ajustar según dominio real

  // 1. Rutas estáticas del directorio
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/directorio`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // 2. Rutas de categorías
  const categoryRoutes: MetadataRoute.Sitemap = DIRECTORY_CATEGORIES.map((category) => ({
    url: `${baseUrl}/directorio/${category.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // 3. Rutas dinámicas de negocios
  let businessRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection('businessDirectory')
      .where('status', '==', 'published')
      .where('publicProfile', '==', true)
      .get();

    businessRoutes = snapshot.docs.map((doc) => {
      const data = doc.data() as BusinessDirectoryEntry;
      return {
        url: `${baseUrl}/negocio/${doc.id}`,
        lastModified: new Date(data.updatedAt || data.listingDate),
        changeFrequency: 'monthly',
        priority: 0.6,
      };
    });
  } catch (error) {
    console.error("Error generating business sitemap routes:", error);
  }

  return [...staticRoutes, ...categoryRoutes, ...businessRoutes];
}
