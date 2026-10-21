/**
 * Utilidades centralizadas para generación de URLs de Blog
 */

export function getBusinessBlogUrl(businessId: string): string {
  if (!businessId || businessId === 'global') {
    return '/blog/global';
  }
  return `/blog/cliente/${businessId}`;
}

export function getBusinessPostUrl(businessId: string | undefined | null, slug: string): string {
  if (!businessId || businessId === 'global') {
    return `/blog/global/${slug}`;
  }
  return `/blog/cliente/${businessId}/${slug}`;
}
