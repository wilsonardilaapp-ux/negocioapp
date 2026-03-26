
export type TipoItem = 'producto' | 'insumo';

export type TipoMovimiento =
  | 'entrada_compra'
  | 'entrada_devolucion_cliente'
  | 'salida_venta'
  | 'salida_devolucion_proveedor'
  | 'ajuste_danio'
  | 'ajuste_inventario_fisico'
  | 'transferencia_bodega';

export type MetodoValuacion = 'promedio_ponderado' | 'peps' | 'ueps';

export type EstadoStock = 'normal' | 'bajo' | 'agotado' | 'sobre_stock';

export type TabKardex =
  | 'resumen'
  | 'kardex'
  | 'productos'
  | 'movimientos'
  | 'configuracion';

export interface ItemInventario {
  id: string;
  codigo: string;
  nombre: string;
  tipoItem: TipoItem;
  categoria: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  costoUnitario: number;
  cuentaContablePUC?: string;
  bodega: string;
  estado: EstadoStock;
  activo: boolean;
}

export interface NuevoItemForm extends Omit<ItemInventario, 'id' | 'stockActual' | 'estado' | 'activo'> {
  id?: string;
}


export interface MovimientoKardex {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  itemId: string;
  documento: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  saldoCantidad?: number; // Opcional, se calculará dinámicamente
  saldoValorTotal?: number; // Opcional, se calculará dinámicamente
  observaciones: string;
  bodegaOrigen?: string;
  bodegaDestino?: string;
}

export interface LineaKardexCalculada {
  fecha: string;
  concepto: string;
  documento: string;
  entrada: { cantidad: number; costoUnitario: number; costoTotal: number } | null;
  salida: { cantidad: number; costoUnitario: number; costoTotal: number } | null;
  saldo: { cantidad: number; costoUnitario: number; costoTotal: number };
}

export interface ResumenKardex {
  totalItems: number;
  totalProductos: number;
  totalInsumos: number;
  valorTotalInventario: number;
  costoVentasMes: number;
  itemsBajoMinimo: number;
  itemsAgotados: number;
  movimientosMes: number;
}

export interface MovimientoSemana {
  semana: string;
  entradas: number;
  salidas: number;
  ajustes: number;
  saldoFinal: number;
}

export interface NuevoMovimientoForm {
  tipo: TipoMovimiento;
  itemId: string;
  cantidad: number;
  costoUnitario: number;
  documento: string;
  fecha: string;
  observaciones: string;
  bodegaOrigen?: string;
  bodegaDestino?: string;
}

export interface ConfiguracionKardex {
  metodoValuacion: MetodoValuacion;
  generarAsientoAutomatico: boolean;
  cuentaInventarioPUC: string;
  cuentaCostoVentasPUC: string;
  alertasStockMinimo: boolean;
  permitirStockNegativo: boolean;
}

export interface Bodega {
  id: string;
  nombre: string;
  descripcion: string;
  totalItems: number;
  valorTotal: number;
}

  
