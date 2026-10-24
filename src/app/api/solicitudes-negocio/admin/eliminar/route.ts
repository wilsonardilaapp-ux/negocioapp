import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';

export const dynamic = 'force-dynamic';

const SOLICITUDES_COLLECTION = 'solicitud_negocios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron IDs válidos para eliminar' }, { status: 400 });
    }

    const db = await getAdminFirestore();

    // Eliminar en bloques respetando el límite de 500 ops de Firestore
    const BATCH_SIZE = 400;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const id of chunk) {
        if (typeof id === 'string' && id.trim()) {
          const docRef = db.collection(SOLICITUDES_COLLECTION).doc(id);
          batch.delete(docRef);
        }
      }
      await batch.commit();
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error('Error al eliminar solicitudes:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al eliminar solicitudes' },
      { status: 500 }
    );
  }
}
