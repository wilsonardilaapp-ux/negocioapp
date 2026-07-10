import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico de solo lectura.
 * Verifica la existencia e integridad de los documentos de shareConfig y publicData.
 */
export async function GET() {
  try {
    const db = await getAdminFirestore();
    const businessId = 'TPV0qjSyoINCYA3ScBfz2HXDSlM2';
    
    // 1. Verificar shareConfig (Donde reside el alias)
    const shareRef = db.doc(`businesses/${businessId}/shareConfig/main`);
    const shareSnap = await shareRef.get();
    
    // 2. Verificar catálogo público (Documento denormalizado que se muestra al cliente)
    const catalogRef = db.doc(`businesses/${businessId}/publicData/catalog`);
    const catalogSnap = await catalogRef.get();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      businessId,
      shareConfig: {
        path: shareRef.path,
        exists: shareSnap.exists,
        data: shareSnap.exists ? shareSnap.data() : null
      },
      publicCatalog: {
        path: catalogRef.path,
        exists: catalogSnap.exists,
        data: catalogSnap.exists ? catalogSnap.data() : null,
        status: catalogSnap.exists 
          ? (catalogSnap.data()?.products ? "OK: Tiene productos" : "WARNING: Documento existe pero está vacío o corrupto")
          : "ERROR: Documento no existe"
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
