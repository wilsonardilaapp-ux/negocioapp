'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PILARES_VALIDOS, 
  type JevPilarTipo, 
  type JevEstadoMemoria, 
  type JevMemoryDocument, 
  type RegistrarAccionInput, 
  type FiltrosAccionesJev 
} from './types';

// Re-exportar solo tipos (TypeScript los borra en runtime, Next.js no los confunde con objetos)
export type { JevPilarTipo, JevEstadoMemoria, JevMemoryDocument, RegistrarAccionInput, FiltrosAccionesJev };

const COLLECTION_NAME = 'jev_memory';

/**
 * Registra una nueva acción en la memoria centralizada JEV.
 */
export async function registrarAccionJev({
  tipo,
  accion,
  datos = {},
  origen,
  usuario,
}: RegistrarAccionInput): Promise<string> {
  if (!PILARES_VALIDOS.includes(tipo)) {
    throw new Error(
      `[JEV MEMORY] Tipo de pilar inválido: "${tipo}". Debe ser uno de: ${PILARES_VALIDOS.join(', ')}`
    );
  }

  if (!usuario || typeof usuario !== 'string' || !usuario.trim()) {
    throw new Error('[JEV MEMORY] El campo "usuario" (usuarioId) es obligatorio para registrar memoria.');
  }

  if (!accion || typeof accion !== 'string' || !accion.trim()) {
    throw new Error('[JEV MEMORY] La descripción de la "accion" es obligatoria.');
  }

  const firestore = await getAdminFirestore();
  const memoryRef = firestore.collection(COLLECTION_NAME).doc();

  const nuevoRegistro: Omit<JevMemoryDocument, 'id'> = {
    tipo,
    accion: accion.trim(),
    datos: datos || {},
    estado: 'abierta',
    fechaInicio: new Date().toISOString(),
    fechaCierre: null,
    origen: origen || 'jev-engine',
    usuario: usuario.trim(),
  };

  await memoryRef.set(nuevoRegistro);
  return memoryRef.id;
}

/**
 * Cierra una acción en memoria y registra el resultado obtenido.
 */
export async function cerrarAccionJev(
  id: string,
  resultado: any
): Promise<{ success: boolean; id: string }> {
  if (!id || typeof id !== 'string') {
    throw new Error('[JEV MEMORY] ID de documento inválido para cerrar acción.');
  }

  const firestore = await getAdminFirestore();
  const docRef = firestore.collection(COLLECTION_NAME).doc(id);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new Error(`[JEV MEMORY] El documento de memoria "${id}" no existe.`);
  }

  const data = snap.data() as JevMemoryDocument;
  if (data.estado === 'cerrada') {
    throw new Error(`[JEV MEMORY] La acción con ID "${id}" ya se encuentra cerrada e inmutable.`);
  }

  const datosActualizados = {
    ...(data.datos || {}),
    resultado,
  };

  await docRef.update({
    estado: 'cerrada',
    fechaCierre: new Date().toISOString(),
    datos: datosActualizados,
  });

  return { success: true, id };
}

/**
 * Consulta acciones registradas en jev_memory filtradas por usuario.
 */
export async function obtenerAccionesJev(
  filtros: FiltrosAccionesJev
): Promise<JevMemoryDocument[]> {
  if (!filtros?.usuario) {
    throw new Error('[JEV MEMORY] El filtro de "usuario" es obligatorio por seguridad.');
  }

  const firestore = await getAdminFirestore();
  let query: FirebaseFirestore.Query = firestore
    .collection(COLLECTION_NAME)
    .where('usuario', '==', filtros.usuario.trim());

  if (filtros.tipo) {
    query = query.where('tipo', '==', filtros.tipo);
  }

  if (filtros.estado) {
    query = query.where('estado', '==', filtros.estado);
  }

  if (filtros.limite && filtros.limite > 0) {
    query = query.limit(filtros.limite);
  }

  const snapshot = await query.get();

  const resultados: JevMemoryDocument[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      tipo: data.tipo,
      accion: data.accion,
      datos: data.datos || {},
      estado: data.estado,
      fechaInicio: data.fechaInicio,
      fechaCierre: data.fechaCierre || null,
      origen: data.origen,
      usuario: data.usuario,
    };
  });

  return resultados.sort(
    (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
  );
}

/**
 * Obtiene un documento individual de memoria por su ID.
 */
export async function obtenerAccionJev(id: string): Promise<JevMemoryDocument | null> {
  if (!id) return null;
  const firestore = await getAdminFirestore();
  const snap = await firestore.collection(COLLECTION_NAME).doc(id).get();

  if (!snap.exists) return null;
  const data = snap.data()!;

  return {
    id: snap.id,
    tipo: data.tipo,
    accion: data.accion,
    datos: data.datos || {},
    estado: data.estado,
    fechaInicio: data.fechaInicio,
    fechaCierre: data.fechaCierre || null,
    origen: data.origen,
    usuario: data.usuario,
  };
}

/**
 * Helper para obtener solo las acciones en estado "abierta" de un usuario.
 */
export async function memoriasActivas(
  usuario: string,
  tipo?: JevPilarTipo
): Promise<JevMemoryDocument[]> {
  return obtenerAccionesJev({
    usuario,
    tipo,
    estado: 'abierta',
  });
}
