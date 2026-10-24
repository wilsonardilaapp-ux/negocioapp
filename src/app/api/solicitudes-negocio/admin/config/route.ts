import { NextRequest, NextResponse } from 'next/server';
import { getSolicitudConfig, saveSolicitudConfig } from '@/modules/solicitudes-negocio/services/solicitudes-service';
import { DEFAULT_SOLICITUD_CONFIG } from '@/modules/solicitudes-negocio/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getSolicitudConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.resetToDefault) {
      const restored = await saveSolicitudConfig(DEFAULT_SOLICITUD_CONFIG);
      return NextResponse.json({ success: true, config: restored, message: 'Configuración restaurada con éxito' });
    }

    const updated = await saveSolicitudConfig(body);
    return NextResponse.json({ success: true, config: updated, message: 'Configuración guardada y publicada' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al guardar configuración' }, { status: 500 });
  }
}
