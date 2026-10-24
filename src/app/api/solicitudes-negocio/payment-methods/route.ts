import { NextResponse } from 'next/server';
import { getPublicPaymentMethods } from '@/modules/solicitudes-negocio/services/solicitud-payments-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPublicPaymentMethods();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error cargando métodos de pago' }, { status: 500 });
  }
}
