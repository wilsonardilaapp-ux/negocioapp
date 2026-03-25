
export type TipoMovimiento =
  | 'entrada_compra'
  | 'entrada_devolucion'
  | 'salida_venta'
  | 'salida_devolucion'
  | 'ajuste_danio'
  | 'ajuste_inventario'
  | 'transferencia';

export type MetodoValuacion = 'promedio' | 'peps' | 'ueps';

export type EstadoStock = 'normal' | 'bajo' | 'agotado' | 'sobre_stock';

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  costoUnitario: number; // Costo de compra o producción más reciente
  cuentaContable: string;
  bodega: string;
  estado: EstadoStock;
}

export interface MovimientoKardex {
  id: string;
  fecha: string; // ISO Date String
  tipo: TipoMovimiento;
  productoId: string;
  documento: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  saldoCantidad: number;
  saldoTotal: number;
  observaciones?: string;
}

export interface LineaKardex {
  fecha: string;
  concepto: string;
  entrada?: { cantidad: number; costoUnitario: number; costoTotal: number };
  salida?: { cantidad: number; costoUnitario: number; costoTotal: number };
  saldo: { cantidad: number; costoUnitario: number; costoTotal: number };
}

export interface ResumenInventario {
  totalProductos: number;
  valorTotalInventario: number;
  costoVentasMes: number;
  productosBajoMinimo: number;
  movimientosMes: number;
}

export interface NuevoMovimientoForm {
  tipo: TipoMovimiento;
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  documento: string;
  fecha: string;
  observaciones?: string;
}

export interface ConfiguracionKardex {
  metodoValuacion: MetodoValuacion;
  generarAsientoAutomatico: boolean;
  cuentaInventario: string;
  cuentaCostoVentas: string;
  alertasStockMinimo: boolean;
}

export interface Bodega {
  id: string;
  nombre: string;
  totalProductos: number;
  valorTotal: number;
}
