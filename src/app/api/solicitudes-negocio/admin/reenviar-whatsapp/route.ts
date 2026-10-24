import { NextRequest, NextResponse } from 'next/server';
import { reenviarWhatsAppSolicitud } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { solicitudId } = await req.json();
    if (!solicitudId) {
      return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 });
    }

    const resultado: any = await reenviarWhatsAppSolicitud(solicitudId);
    if (!resultado.success) {
      return NextResponse.json({ success: false, error: resultado.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp procesado exitosamente',
      whatsappUrl: resultado.whatsappUrl || null 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al reenviar WhatsApp' }, { status: 500 });
  }
}
