export type TipoCuenta = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Costos' | 'Gastos';

export interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo: number;
  esCuentaMayor: boolean; // Indicates if it's a main account or a sub-account
  permiteMovimientos: boolean; // If transactions can be posted to this account
}

export interface DetalleAsiento {
  id: string;
  cuentaCodigo: string;
  cuentaNombre: string;
  descripcion: string;
  debito: number;
  credito: number;
}

export interface AsientoContable {
  id: string;
  fecha: string; // ISO Date String
  concepto: string;
  totalDebitos: number;
  totalCreditos: number;
  estaCuadrado: boolean;
  documentoReferencia?: string;
  detalles: DetalleAsiento[];
}

export type TipoImpuesto = 'IVA' | 'Retefuente' | 'ICA' | 'Consumo';

export interface Impuesto {
  id: string;
  nombre: string;
  tipo: TipoImpuesto;
  tasa: number; // Percentage
  cuentaContableCompras: string; // PUC code
  cuentaContableVentas: string; // PUC code
  activo: boolean;
}

export interface DeclaracionImpuesto {
  id: string;
  periodo: string; // e.g., '2023-10'
  impuestoId: string;
  baseGravable: number;
  valorCalculado: number;
  valorPagado: number;
  fechaPresentacion: string; // ISO Date
}

export type TipoReporte = 'balance_general' | 'estado_resultados' | 'libro_diario';

export interface ReporteContable {
  tipo: TipoReporte;
  fechaGeneracion: string;
  rangoFechas: { inicio: string; fin: string };
  datos: any[]; // This will be specific to each report type
  totales: any;
}

export interface MovimientoLibro {
  id: string;
  fecha: string; // ISO
  descripcion: string;
  debito: number;
  credito: number;
  esConciliado: boolean;
}

export interface MovimientoExtracto {
  id: string;
  fecha: string; // ISO
  descripcion: string;
  monto: number; // Positivo para depósitos, negativo para retiros
  esConciliado: boolean;
}

export interface PartidaConciliada {
    id: string;
    movimientoLibroId: string;
    movimientoExtractoId: string;
    fechaConciliacion: string; //ISO
}

export interface ActivoFijo {
  id: string;
  nombre: string;
  codigo: string;
  fechaAdquisicion: string; // ISO
  costoInicial: number;
  valorResidual: number;
  vidaUtil: number; // en años
  depreciacionAcumulada: number;
  valorEnLibros: number;
  cuentaActivo: string; // e.g., 1540
  cuentaDepreciacion: string; // e.g., 1592
  cuentaGastoDepreciacion: string; // e.g., 5160
}
