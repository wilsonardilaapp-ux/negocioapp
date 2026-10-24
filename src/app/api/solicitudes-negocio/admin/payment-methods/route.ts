import { NextRequest, NextResponse } from 'next/server';
import { 
  getSolicitudPaymentConfig, 
  saveSolicitudPaymentConfig, 
  importFromGlobalPaymentConfig 
} from '@/modules/solicitudes-negocio/services/solicitud-payments-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSolicitudPaymentConfig();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error cargando configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.importGlobal) {
      const imported = await importFromGlobalPaymentConfig();
      return NextResponse.json({ success: true, data: imported, message: 'Configuración importada desde pasarelas globales.' });
    }

    const saved = await saveSolicitudPaymentConfig(body);
    return NextResponse.json({ success: true, data: saved, message: 'Configuración de pagos guardada con éxito.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al guardar configuración' }, { status: 500 });
  }
}
