export const PILARES_VALIDOS = [
  'whatsapp',
  'inventario',
  'retencion',
  'resenas',
  'pedidos',
  'resumen',
  'contabilidad',
  'pagos',
  'vencimientos',
  'empleados',
  'promociones',
  'cupones',
  'sugerencias',
  'clientes-nuevos',
] as const;

export type JevPilarTipo = (typeof PILARES_VALIDOS)[number];
export type JevEstadoMemoria = 'abierta' | 'cerrada';

export interface JevMemoryDocument {
  id: string;
  tipo: JevPilarTipo;
  accion: string;
  datos: Record<string, any>;
  estado: JevEstadoMemoria;
  fechaInicio: string; // ISO 8601
  fechaCierre: string | null;
  origen: string;
  usuario: string; // usuarioId
}

export interface RegistrarAccionInput {
  tipo: JevPilarTipo;
  accion: string;
  datos?: Record<string, any>;
  origen: string;
  usuario: string; // usuarioId autenticado
}

export interface FiltrosAccionesJev {
  usuario: string; // Filtro obligatorio de seguridad por usuario (Regla 7)
  tipo?: JevPilarTipo;
  estado?: JevEstadoMemoria;
  fechaDesde?: string;
  fechaHasta?: string;
  limite?: number;
}
