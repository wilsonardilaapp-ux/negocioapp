import { redirect } from 'next/navigation';
import { getTrackingConfig } from '@/modules/solicitudes-negocio/services/solicitud-tracking-service';

export const dynamic = 'force-dynamic';

export default async function RedirectAliasPage({
  params,
  searchParams
}: {
  params: { alias: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { alias } = params;
  const config = await getTrackingConfig();

  const query = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([k, v]) => {
    if (typeof v === 'string') query.set(k, v);
  });

  const queryString = query.toString();
  const target = queryString ? `/registro-negocio?${queryString}` : '/registro-negocio';

  // Si coincide con el alias configurado, redirigir
  if (config.customAlias && config.customAlias.toLowerCase() === alias.toLowerCase()) {
    redirect(target);
  }

  // Fallback por defecto a registro-negocio
  redirect(target);
}
