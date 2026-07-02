import { MetadataRoute } from 'next';
import { getAdminFirestore } from '@/firebase/server-init';
import { DIRECTORY_CATEGORIES } from '@/models/business-directory';
import type { Business } from '@/models/business';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://markix.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/directorio`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = DIRECTORY_CATEGORIES.map((category) => ({
    url: `${baseUrl}/directorio/${category.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  let businessRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection('businesses')
      .where('directoryEnabled', '==', true)
      .where('directoryStatus', '==', 'approved')
      .get();

    businessRoutes = snapshot.docs.map((doc) => {
      return {
        url: `${baseUrl}/negocio/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      };
    });
  } catch (error) {
    console.error("Error generating business sitemap routes:", error);
  }

  return [...staticRoutes, ...categoryRoutes, ...businessRoutes];
}
