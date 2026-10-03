import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface ColaboradorEquipoJev {
  id: string;
  nombre: string;
  especialidad: string;
  telefono?: string;
  isActive: boolean;
  serviciosAsignadosCount: number;
  nombresServicios: string[];
  nivelCarga: 'alta' | 'media' | 'baja' | 'sin_servicios';
}

export interface ContextoEmpleados {
  businessId: string;
  totalColaboradores: number;
  activosCount: number;
  inactivosCount: number;
  sinServiciosCount: number;
  totalServiciosDisponibles: number;
  colaboradores: ColaboradorEquipoJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Equipo / Profesionales (SOLO LECTURA).
 * Consulta bookingStaff y bookingServices sin modificar ningún dato.
 */
export async function getEmpleadosContext(businessId: string): Promise<ContextoEmpleados> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT EMPLEADOS] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    // 1. Lectura de Servicios (para mapear nombres y porcentaje de carga)
    const servicesMap = new Map<string, string>();
    let totalServiciosDisponibles = 0;

    try {
      const servSnap = await firestore
        .collection(`businesses/${businessId}/bookingServices`)
        .get();
      totalServiciosDisponibles = servSnap.size;
      servSnap.forEach((doc) => {
        servicesMap.set(doc.id, doc.data().name || 'Servicio');
      });
    } catch (e) {
      // Opcional
    }

    // 2. Lectura de Colaboradores (SOLO LECTURA)
    const staffSnap = await firestore
      .collection(`businesses/${businessId}/bookingStaff`)
      .get();

    if (staffSnap.empty) {
      return {
        businessId,
        totalColaboradores: 0,
        activosCount: 0,
        inactivosCount: 0,
        sinServiciosCount: 0,
        totalServiciosDisponibles,
        colaboradores: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const colaboradores: ColaboradorEquipoJev[] = [];
    let activosCount = 0;
    let inactivosCount = 0;
    let sinServiciosCount = 0;

    staffSnap.forEach((doc) => {
      const s = doc.data();
      const isActive = s.isActive !== undefined ? !!s.isActive : true;
      if (isActive) activosCount++;
      else inactivosCount++;

      const assignedServiceIds = Array.isArray(s.assignedServiceIds) ? s.assignedServiceIds : [];
      const nombresServicios = assignedServiceIds.map((id: string) => servicesMap.get(id) || id);

      let nivelCarga: 'alta' | 'media' | 'baja' | 'sin_servicios' = 'media';
      if (assignedServiceIds.length === 0) {
        nivelCarga = 'sin_servicios';
        sinServiciosCount++;
      } else if (totalServiciosDisponibles > 0 && assignedServiceIds.length >= totalServiciosDisponibles * 0.7) {
        nivelCarga = 'alta';
      } else if (assignedServiceIds.length <= 1) {
        nivelCarga = 'baja';
      }

      colaboradores.push({
        id: doc.id,
        nombre: s.name || 'Profesional',
        especialidad: s.specialty || 'General',
        telefono: s.phone || undefined,
        isActive,
        serviciosAsignadosCount: assignedServiceIds.length,
        nombresServicios,
        nivelCarga,
      });
    });

    // Ordenar: primero los que no tienen servicios o están inactivos para atención rápida
    colaboradores.sort((a, b) => {
      if (!a.isActive && b.isActive) return -1;
      if (a.serviciosAsignadosCount !== b.serviciosAsignadosCount) return a.serviciosAsignadosCount - b.serviciosAsignadosCount;
      return a.nombre.localeCompare(b.nombre);
    });

    // 3. Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'empleados',
      limite: 10,
    });

    const estadoOp = sinServiciosCount > 0 || inactivosCount > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalColaboradores: colaboradores.length,
      activosCount,
      inactivosCount,
      sinServiciosCount,
      totalServiciosDisponibles,
      colaboradores,
      historialMemoria,
      estado: estadoOp,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT EMPLEADOS] Error:', error);
    return {
      businessId,
      totalColaboradores: 0,
      activosCount: 0,
      inactivosCount: 0,
      sinServiciosCount: 0,
      totalServiciosDisponibles: 0,
      colaboradores: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
