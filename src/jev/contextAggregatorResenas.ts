import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface ResenaJev {
  id: string;
  clienteNombre: string;
  calificacion: number; // 1 - 5
  comentario: string;
  respuesta?: string;
  tieneRespuesta: boolean;
  fechaCreacion: string;
  nivelUrgencia: 'critica' | 'alerta' | 'positiva';
}

export interface ContextoResenas {
  businessId: string;
  totalResenas: number;
  promedioCalificacion: number;
  distribucion: Record<number, number>;
  resenasSinResponder: ResenaJev[];
  resenasCriticas: ResenaJev[]; // <= 2 estrellas sin responder
  resenasAlerta: ResenaJev[];   // 3 estrellas sin responder
  resenasPositivas: ResenaJev[]; // 4 - 5 estrellas sin responder
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Reseñas y Reputación (SOLO LECTURA).
 * Consulta directoryRatings y reviews existentes en Firestore sin modificar nada.
 */
export async function getResenasContext(businessId: string): Promise<ContextoResenas> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT RESENAS] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    const todasLasResenas: ResenaJev[] = [];
    const idsProcesados = new Set<string>();

    // 1. Lectura de directoryRatings (SOLO LECTURA)
    try {
      const dirSnap = await firestore
        .collection('directoryRatings')
        .where('businessId', '==', businessId)
        .limit(100)
        .get();

      dirSnap.forEach((doc) => {
        const d = doc.data();
        const calificacion = Number(d.rating) || 5;
        const respuesta = d.reply || d.response || undefined;
        const tieneRespuesta = !!(respuesta && respuesta.trim());

        let nivelUrgencia: 'critica' | 'alerta' | 'positiva' = 'positiva';
        if (calificacion <= 2) nivelUrgencia = 'critica';
        else if (calificacion === 3) nivelUrgencia = 'alerta';

        todasLasResenas.push({
          id: doc.id,
          clienteNombre: d.name || d.customerName || 'Cliente del Directorio',
          calificacion,
          comentario: d.comment || d.reviewText || 'Sin comentario de texto.',
          respuesta,
          tieneRespuesta,
          fechaCreacion: d.createdAt || new Date().toISOString(),
          nivelUrgencia,
        });

        idsProcesados.add(doc.id);
      });
    } catch (e) {
      console.warn('[JEV RESENAS] directoryRatings no disponible:', e);
    }

    // 2. Lectura complementaria de subcolección businesses/{id}/reviews si existe
    try {
      const revSnap = await firestore
        .collection(`businesses/${businessId}/reviews`)
        .limit(100)
        .get();

      revSnap.forEach((doc) => {
        if (!idsProcesados.has(doc.id)) {
          const d = doc.data();
          const calificacion = Number(d.rating) || 5;
          const respuesta = d.reply || d.response || undefined;
          const tieneRespuesta = !!(respuesta && respuesta.trim());

          let nivelUrgencia: 'critica' | 'alerta' | 'positiva' = 'positiva';
          if (calificacion <= 2) nivelUrgencia = 'critica';
          else if (calificacion === 3) nivelUrgencia = 'alerta';

          todasLasResenas.push({
            id: doc.id,
            clienteNombre: d.name || d.customerName || 'Cliente',
            calificacion,
            comentario: d.comment || 'Sin comentario escrito.',
            respuesta,
            tieneRespuesta,
            fechaCreacion: d.createdAt || new Date().toISOString(),
            nivelUrgencia,
          });

          idsProcesados.add(doc.id);
        }
      });
    } catch (e) {
      // Colección opcional
    }

    if (todasLasResenas.length === 0) {
      return {
        businessId,
        totalResenas: 0,
        promedioCalificacion: 5.0,
        distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        resenasSinResponder: [],
        resenasCriticas: [],
        resenasAlerta: [],
        resenasPositivas: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    // Ordenar cronológicamente (más recientes primero)
    todasLasResenas.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

    // Métricas y distribución
    const distribucion: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumaEstrellas = 0;

    todasLasResenas.forEach((r) => {
      distribucion[r.calificacion] = (distribucion[r.calificacion] || 0) + 1;
      sumaEstrellas += r.calificacion;
    });

    const promedioCalificacion = Math.round((sumaEstrellas / todasLasResenas.length) * 10) / 10;

    // Filtrar reseñas pendientes de respuesta
    const resenasSinResponder = todasLasResenas.filter((r) => !r.tieneRespuesta);
    const resenasCriticas = resenasSinResponder.filter((r) => r.calificacion <= 2);
    const resenasAlerta = resenasSinResponder.filter((r) => r.calificacion === 3);
    const resenasPositivas = resenasSinResponder.filter((r) => r.calificacion >= 4);

    // 3. Memoria histórica de JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'resenas',
      limite: 10,
    });

    const estado = resenasCriticas.length > 0 || resenasSinResponder.length > 3 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalResenas: todasLasResenas.length,
      promedioCalificacion,
      distribucion,
      resenasSinResponder,
      resenasCriticas,
      resenasAlerta,
      resenasPositivas,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT RESENAS] Error:', error);
    return {
      businessId,
      totalResenas: 0,
      promedioCalificacion: 5.0,
      distribucion: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      resenasSinResponder: [],
      resenasCriticas: [],
      resenasAlerta: [],
      resenasPositivas: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}

/**
 * Función pública para el Resumen Ejecutivo (Fase 7)
 */
export async function getMetricasPilarResenas(businessId: string) {
  const contexto = await getResenasContext(businessId);
  return {
    pilar: 'resenas',
    totalResenas: contexto.totalResenas,
    promedio: contexto.promedioCalificacion,
    sinResponder: contexto.resenasSinResponder.length,
    criticas: contexto.resenasCriticas.length,
    estado: contexto.estado,
    alertaCritica: contexto.resenasCriticas.length > 0,
  };
}
