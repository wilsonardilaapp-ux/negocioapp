import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';

export const dynamic = 'force-dynamic';

/**
 * Script de un solo uso para restaurar campos borrados accidentalmente.
 * No forma parte de la lógica permanente de la aplicación.
 */
export async function GET() {
  try {
    const db = await getAdminFirestore();
    const docPath = 'businesses/TPV0qjSyoINCYA3ScBfz2HXDSlM2/shareConfig/main';
    const docRef = db.doc(docPath);

    // Verificación previa del documento
    const initialSnap = await docRef.get();
    if (!initialSnap.exists) {
      return NextResponse.json({ 
        success: false, 
        error: `El documento en la ruta ${docPath} no existe.` 
      }, { status: 404 });
    }

    // ACTUALIZACIÓN QUIRÚRGICA: Solo los 2 campos autorizados
    await docRef.update({
      slug: "salóndebellezanatura",
      useCustomSlug: true
    });

    // Obtener el estado final para mostrarlo en la respuesta
    const finalSnap = await docRef.get();
    const finalData = finalSnap.data();

    return NextResponse.json({ 
      success: true, 
      message: "Restauración completada con éxito.",
      timestamp: new Date().toISOString(),
      documentStatus: "Updated",
      result: {
        id: finalSnap.id,
        // Mostramos el contenido para confirmar que slugLanding y los demás siguen intactos
        content: finalData 
      }
    });

  } catch (error: any) {
    console.error("[FIX-SCRIPT] Error:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
