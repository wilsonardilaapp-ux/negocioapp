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
