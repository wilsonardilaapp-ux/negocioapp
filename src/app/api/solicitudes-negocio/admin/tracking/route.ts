import { NextRequest, NextResponse } from 'next/server';
import { 
  getTrackingAnalytics, 
  saveTrackingAlias, 
  saveTrackingCard, 
  deleteTrackingCard, 
  createDefaultSuggestedCards 
} from '@/modules/solicitudes-negocio/services/solicitud-tracking-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get('days')) || 30;
    const data = await getTrackingAnalytics(days);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error cargando métricas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'saveAlias') {
      const updated = await saveTrackingAlias(body.alias);
      return NextResponse.json({ success: true, config: updated, message: 'Alias actualizado con éxito.' });
    }

    if (body.action === 'saveCard') {
      const card = await saveTrackingCard(body.card);
      return NextResponse.json({ success: true, card, message: 'Tarjeta de seguimiento guardada.' });
    }

    if (body.action === 'deleteCard') {
      await deleteTrackingCard(body.cardId);
      return NextResponse.json({ success: true, message: 'Tarjeta eliminada.' });
    }

    if (body.action === 'createDefaults') {
      const created = await createDefaultSuggestedCards();
      return NextResponse.json({ success: true, cards: created, message: 'Tarjetas sugeridas creadas.' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error en operación' }, { status: 500 });
  }
}
