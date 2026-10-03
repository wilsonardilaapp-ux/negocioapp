'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getClientesNuevosContext, ContextoClientesNuevos, ContactoJev } from './contextAggregatorClientesNuevos';
import { getAdminFirestore } from '@/firebase/server-init';
import { registrarAccionJev } from './jevMemory';

export interface ImportarContactosInput {
  businessId: string;
  filas: { nombre: string; telefono: string; email?: string }[];
  omitirDuplicados: boolean;
}

/**
 * Guarda contactos importados validando límite de 500 y duplicados por teléfono.
 */
export async function guardarContactosImportados({ businessId, filas, omitirDuplicados }: ImportarContactosInput) {
  if (!businessId) throw new Error('Business ID requerido.');
  if (filas.length > 500) throw new Error('Límite excedido: Máximo 500 contactos por subida.');

  const firestore = await getAdminFirestore();
  const colRef = firestore.collection(`businesses/${businessId}/importedContacts`);

  // Obtener teléfonos existentes para detectar duplicados
  const existingSnap = await colRef.get();
  const existingPhones = new Set<string>();
  existingSnap.forEach(doc => {
    const tel = (doc.data().telefono || '').replace(/\D/g, '');
    if (tel) existingPhones.add(tel);
  });

  let importados = 0;
  let duplicadosOmitidos = 0;
  let sinWhatsApp = 0;

  for (const fila of filas) {
    const nombre = (fila.nombre || '').trim();
    const telefono = (fila.telefono || '').trim();
    const email = (fila.email || '').trim();

    if (!nombre || !telefono) continue;

    const cleanTel = telefono.replace(/\D/g, '');
    if (existingPhones.has(cleanTel)) {
      if (omitirDuplicados) {
        duplicadosOmitidos++;
        continue;
      }
    }

    if (cleanTel.length < 7) {
      sinWhatsApp++;
    }

    existingPhones.add(cleanTel);

    await colRef.add({
      nombre,
      telefono,
      email: email || null,
      origen: 'Importado CSV',
      createdAt: new Date().toISOString(),
    });
    importados++;
  }

  // Registrar en jev_memory (Regla 6)
  await registrarAccionJev({
    tipo: 'clientes-nuevos',
    accion: `Importación masiva de contactos (${importados} importados, ${duplicadosOmitidos} omitidos)`,
    datos: { importados, duplicadosOmitidos, sinWhatsApp },
    origen: 'jevEngineClientesNuevos',
    usuario: businessId,
  });

  return { success: true, importados, duplicadosOmitidos, sinWhatsApp };
}

/**
 * Guarda un contacto de forma manual con validación de duplicados.
 */
export async function guardarClienteManual({
  businessId,
  nombre,
  telefono,
  email,
  notas,
  forzarGuardado = false,
}: {
  businessId: string;
  nombre: string;
  telefono: string;
  email?: string;
  notas?: string;
  forzarGuardado?: boolean;
}) {
  if (!businessId || !nombre || !telefono) throw new Error('Nombre y teléfono son obligatorios.');

  const firestore = await getAdminFirestore();
  const colRef = firestore.collection(`businesses/${businessId}/importedContacts`);

  const cleanTel = telefono.replace(/\D/g, '');
  if (!forzarGuardado) {
    const existingSnap = await colRef.where('telefono', '==', telefono).get();
    if (!existingSnap.empty) {
      return { duplicate: true, message: 'Ya existe un cliente registrado con este número de teléfono.' };
    }
  }

  await colRef.add({
    nombre: nombre.trim(),
    telefono: telefono.trim(),
    email: email ? email.trim() : null,
    notas: notas ? notas.trim() : null,
    origen: 'Manual',
    createdAt: new Date().toISOString(),
  });

  await registrarAccionJev({
    tipo: 'clientes-nuevos',
    accion: `Alta manual de cliente: ${nombre.trim()}`,
    datos: { nombre, telefono, origen: 'Manual' },
    origen: 'jevEngineClientesNuevos',
    usuario: businessId,
  });

  return { success: true };
}

/**
 * Registra campaña enviada a clientes nuevos en jev_memory.
 */
export async function registrarCampanaClientesEnviada({
  businessId,
  destinatariosCount,
  plantillaUsada,
}: {
  businessId: string;
  destinatariosCount: number;
  plantillaUsada: string;
}) {
  return registrarAccionJev({
    tipo: 'clientes-nuevos',
    accion: `Campaña WhatsApp enviada a ${destinatariosCount} contacto(s) nuevo(s)`,
    datos: { destinatariosCount, plantillaUsada },
    origen: 'JevModalCampanaClientes',
    usuario: businessId,
  });
}

/**
 * Elimina contactos seleccionados de Firestore.
 */
export async function eliminarContactos({
  businessId,
  ids,
}: {
  businessId: string;
  ids: string[];
}) {
  if (!businessId) throw new Error('Business ID requerido.');
  if (!ids || ids.length === 0) throw new Error('No hay contactos seleccionados para eliminar.');

  const firestore = await getAdminFirestore();
  const colRef = firestore.collection(`businesses/${businessId}/importedContacts`);

  const batchSize = 400;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = firestore.batch();
    const chunk = ids.slice(i, i + batchSize);
    for (const id of chunk) {
      batch.delete(colRef.doc(id));
    }
    await batch.commit();
  }

  await registrarAccionJev({
    tipo: 'clientes-nuevos',
    accion: `Eliminación masiva de ${ids.length} contacto(s) nuevo(s)`,
    datos: { eliminados: ids.length, ids },
    origen: 'JevModalEliminarClientes',
    usuario: businessId,
  });

  return { success: true, eliminados: ids.length };
}

export interface SugerenciaCliente {
  id: string;
  titulo: string;
  descripcion: string;
  accionTipo: 'campana_bienvenida' | 'importar_mas' | 'revisar_sin_whatsapp';
  impactoEstimado: string;
  datosRespaldo: string;
  destinatariosSugeridosIds?: string[];
}

export interface CopilotoClientesNuevosOutput {
  diagnostico: string;
  totalContactos: number;
  totalCsv: number;
  totalManual: number;
  sinCampanaCount: number;
  sinWhatsAppCount: number;
  inactivosMasDe15DiasCount: number;
  alertas: string[];
  sugerencias: SugerenciaCliente[];
  patronesAprendidos: string[];
  historialMemoria: any[];
  fechaGeneracion: string;
}

/**
 * Motor del Copiloto de Clientes Nuevos.
 */
export async function obtenerCopilotoClientesNuevos(businessId: string): Promise<CopilotoClientesNuevosOutput> {

  // Validación de límites y consumo atómico (Fase 3 & Proxy Universal anti-TypeError)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return new Proxy({
      diagnostico: "El módulo JEV Copiloto no está activo para el plan actual de este negocio.",
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        if (typeof prop === 'string' && (prop.endsWith('Count') || prop.includes('Total') || prop.includes('Debitos') || prop.includes('Creditos') || prop.includes('Inversion'))) return 0;
        return [];
      }
    }) as any;
  }
  if (!limitsInfo.canConsume) {
    return new Proxy({
      diagnostico: `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`,
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        if (typeof prop === 'string' && (prop.endsWith('Count') || prop.includes('Total') || prop.includes('Debitos') || prop.includes('Creditos') || prop.includes('Inversion'))) return 0;
        return [];
      }
    }) as any;
  }
  await consumeJevCopilotCredit(businessId);
  

  const contexto = await getClientesNuevosContext(businessId);
  const contactos = contexto.contactos || [];

  const totalCsv = contactos.filter((c) => c.origen === 'Importado CSV').length;
  const totalManual = contactos.filter((c) => c.origen === 'Manual').length;
  const sinCampana = contactos.filter((c) => !c.campanaEnviada);
  const sinWhatsApp = contactos.filter((c) => !c.tieneWhatsApp);

  const ahora = Date.now();
  const inactivosMasDe15Dias = sinCampana.filter((c) => {
    if (!c.createdAt) return false;
    const diffDias = (ahora - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDias > 15;
  });

  const alertas: string[] = [];
  if (sinCampana.length > 0) {
    alertas.push(`${sinCampana.length} de ${contactos.length} clientes nunca recibieron una campaña.`);
  }
  if (inactivosMasDe15Dias.length > 0) {
    alertas.push(`${inactivosMasDe15Dias.length} clientes importados hace más de 15 días siguen sin contacto.`);
  }
  if (sinWhatsApp.length > 0) {
    alertas.push(`${sinWhatsApp.length} cliente(s) registrados no tienen número de WhatsApp válido.`);
  }

  const sugerencias: SugerenciaCliente[] = [];
  if (sinCampana.length > 0) {
    sugerencias.push({
      id: 'sug-bienvenida',
      titulo: `Enviar campaña de bienvenida a los ${sinCampana.length} clientes sin contacto`,
      descripcion: 'Pre-selecciona a todos los contactos que aún no han recibido campañas y abre el envío masivo.',
      accionTipo: 'campana_bienvenida',
      impactoEstimado: 'Alto impacto',
      datosRespaldo: `${sinCampana.length} contactos pendientes de bienvenida`,
      destinatariosSugeridosIds: sinCampana.map((c) => c.id),
    });
  }

  if (sinWhatsApp.length > 0) {
    sugerencias.push({
      id: 'sug-sin-whatsapp',
      titulo: 'Reintentar o validar clientes Sin WhatsApp',
      descripcion: 'Completa o corrige el número telefónico para incorporarlos al canal de ventas por WhatsApp.',
      accionTipo: 'revisar_sin_whatsapp',
      impactoEstimado: 'Recuperación',
      datosRespaldo: `${sinWhatsApp.length} contacto(s) descartados por número corto`,
    });
  }

  sugerencias.push({
    id: 'sug-importar',
    titulo: 'Importar más contactos (CSV)',
    descripcion: 'Aumenta tu base de clientes subiendo listas de pedidos o clientes anteriores.',
    accionTipo: 'importar_mas',
    impactoEstimado: 'Crecimiento',
    datosRespaldo: `Base actual: ${contactos.length} contactos totales`,
  });

  const patronesAprendidos: string[] = [];
  if (contexto.historialMemoria && contexto.historialMemoria.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${contexto.historialMemoria.length} acción(es) registrada(s) en este módulo.`
    );
  } else {
    patronesAprendidos.push('Sin historial de hallazgos previos en memoria.');
  }

  return {
    diagnostico: `Base de ${contactos.length} clientes analizada.`,
    totalContactos: contactos.length,
    totalCsv,
    totalManual,
    sinCampanaCount: sinCampana.length,
    sinWhatsAppCount: sinWhatsApp.length,
    inactivosMasDe15DiasCount: inactivosMasDe15Dias.length,
    alertas,
    sugerencias,
    patronesAprendidos,
    historialMemoria: contexto.historialMemoria || [],
    fechaGeneracion: new Date().toISOString(),
  };
}

export async function consultarJevClientesNuevos(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getClientesNuevosContext(businessId);
  const contactos = contexto.contactos || [];
  const q = pregunta.toLowerCase();

  if (q.includes('cuántos') || q.includes('cuantos') || q.includes('total')) {
    const csv = contactos.filter((c) => c.origen === 'Importado CSV').length;
    const manual = contactos.filter((c) => c.origen === 'Manual').length;
    return `Tienes ${contactos.length} clientes registrados en total: ${csv} importados por CSV y ${manual} dados de alta manualmente.`;
  }

  if (q.includes('campaña') || q.includes('campana') || q.includes('enviado') || q.includes('quiénes')) {
    const sinCampana = contactos.filter((c) => !c.campanaEnviada);
    return `Hay ${sinCampana.length} cliente(s) que aún no han recibido ninguna campaña de WhatsApp.`;
  }

  if (q.includes('mes') || q.includes('fecha') || q.includes('llegaron')) {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anoActual = ahora.getFullYear();
    const delMes = contactos.filter((c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === mesActual && d.getFullYear() === anoActual;
    }).length;
    return `Durante este mes se han incorporado ${delMes} cliente(s) a tu base de datos.`;
  }

  return `Tu base tiene ${contactos.length} contactos. Pregúntame sobre el total de clientes, a quiénes les falta campaña o cuántos llegaron este mes.`;
}

export async function registrarSugerenciaClientesEjecutada({ businessId, sugerenciaId, detalle }: { businessId: string; sugerenciaId: string; detalle: string }) {
  return registrarAccionJev({
    tipo: 'clientes-nuevos',
    accion: `Sugerencia Copiloto aplicada: ${detalle}`,
    datos: { sugerenciaId, detalle },
    origen: 'JevCopilotWidgetClientesNuevos',
    usuario: businessId,
  });
}
