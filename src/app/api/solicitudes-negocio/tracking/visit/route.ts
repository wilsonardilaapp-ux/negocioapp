import { NextRequest, NextResponse } from 'next/server';
import { recordVisit } from '@/modules/solicitudes-negocio/services/solicitud-tracking-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { channelCode, sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ success: false });
    }

    const recorded = await recordVisit(channelCode, sessionId);
    return NextResponse.json({ success: true, recorded });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
